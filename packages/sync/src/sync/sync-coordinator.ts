import { GitCLI } from '../git/git-cli.js';
import { GitStatusInspector } from '../git/git-status.js';
import { GitDiffInspector } from '../git/git-diff.js';
import { GitLockMonitor } from '../git/git-lock.js';
import { PreCommitScanner } from '../safety/pre-commit-scanner.js';
import { CommitMessageService } from '../commit/message-generator.js';
import { RepoMutex } from './repo-mutex.js';
import { RetryQueue } from './retry-queue.js';
import type { SyncResult } from './types.js';
import type { QuarantinedFile } from '../safety/types.js';
import {
  DeckEventBus,
  type SyncConfigRepository,
  type SyncEventRepository,
  type CommitHistoryRepository,
  type RemoteSyncStateRepository
} from '@nimo-deck/core';

export interface SyncCoordinatorDependencies {
  git?: GitCLI;
  statusInspector?: GitStatusInspector;
  diffInspector?: GitDiffInspector;
  lockMonitor?: GitLockMonitor;
  scanner?: PreCommitScanner;
  commitService?: CommitMessageService;
  mutex?: RepoMutex;
  retryQueue?: RetryQueue;
  syncConfigRepo?: SyncConfigRepository;
  syncEventRepo?: SyncEventRepository;
  commitHistoryRepo?: CommitHistoryRepository;
  remoteSyncStateRepo?: RemoteSyncStateRepository;
  eventBus?: DeckEventBus;
}

export class SyncCoordinator {
  private git: GitCLI;
  private statusInspector: GitStatusInspector;
  private diffInspector: GitDiffInspector;
  private lockMonitor: GitLockMonitor;
  private scanner: PreCommitScanner;
  private commitService: CommitMessageService;
  private mutex: RepoMutex;
  private retryQueue: RetryQueue;
  private syncConfigRepo?: SyncConfigRepository;
  private syncEventRepo?: SyncEventRepository;
  private commitHistoryRepo?: CommitHistoryRepository;
  private remoteSyncStateRepo?: RemoteSyncStateRepository;
  private eventBus: DeckEventBus;

  constructor(deps: SyncCoordinatorDependencies = {}) {
    this.git = deps.git ?? new GitCLI();
    this.statusInspector = deps.statusInspector ?? new GitStatusInspector(this.git);
    this.diffInspector = deps.diffInspector ?? new GitDiffInspector(this.git);
    this.lockMonitor = deps.lockMonitor ?? new GitLockMonitor();
    this.scanner = deps.scanner ?? new PreCommitScanner();
    this.commitService = deps.commitService ?? new CommitMessageService();
    this.mutex = deps.mutex ?? new RepoMutex();
    this.retryQueue = deps.retryQueue ?? new RetryQueue();
    this.syncConfigRepo = deps.syncConfigRepo;
    this.syncEventRepo = deps.syncEventRepo;
    this.commitHistoryRepo = deps.commitHistoryRepo;
    this.remoteSyncStateRepo = deps.remoteSyncStateRepo;
    this.eventBus = deps.eventBus ?? DeckEventBus.getInstance();
  }

  /**
   * Orchestrates the complete synchronization cycle for a repository.
   */
  async syncRepository(
    projectId: string,
    repoPath: string,
    options: { dryRun?: boolean } = {}
  ): Promise<SyncResult> {
    const start = Date.now();
    const releaseLock = await this.mutex.acquire(repoPath);

    let commitCreated = false;
    let commitSha: string | undefined;
    let pushed = false;
    let pulled = false;
    let isDiverged = false;
    const quarantinedFiles: QuarantinedFile[] = [];

    try {
      // 1. Check for stale .git/index.lock
      this.lockMonitor.clearStaleLock(repoPath);

      // 2. Fetch project sync config
      const config = this.syncConfigRepo?.getByProjectId(projectId);
      const isDryRun = options.dryRun ?? (config?.dryRunMode || false);
      const autoCommit = config ? config.autoCommitEnabled : true;
      const autoPushMode = config ? config.autoPushMode : 'ON_COMMIT';

      // 3. Inspect working tree status
      const status = await this.statusInspector.getStatus(repoPath);

      // Candidate files to stage: modified/deleted in working tree + untracked
      const candidateFiles = [
        ...status.unstaged.map((f) => f.path),
        ...status.untracked
      ];

      // 4. Pre-Commit Safety & Secret Scanner
      if (candidateFiles.length > 0) {
        const scanResult = await this.scanner.scan(repoPath, candidateFiles);

        if (scanResult.quarantinedFiles.length > 0) {
          quarantinedFiles.push(...scanResult.quarantinedFiles);
          for (const qf of scanResult.quarantinedFiles) {
            this.eventBus.emit('security:secret_blocked', {
              projectId,
              filePath: qf.path,
              reason: `${qf.reason}: ${qf.details}`
            });
          }
        }

        // 5. Stage ONLY verified safe files
        if (scanResult.safeFiles.length > 0 && autoCommit && !isDryRun) {
          for (const safeFile of scanResult.safeFiles) {
            await this.git.exec(['add', '--', safeFile], repoPath);
          }
        }
      }

      // 6. Inspect staged changes
      const updatedStatus = await this.statusInspector.getStatus(repoPath);

      if (updatedStatus.staged.length > 0 && autoCommit) {
        const stagedPaths = updatedStatus.staged.map((f) => f.path);
        const diffSummary = await this.diffInspector.getStagedDiffSummary(repoPath);
        const diffSnippet = await this.diffInspector.getStagedDiff(repoPath, 2000);

        // Generate commit message (via AI or conventional commits heuristic)
        const commitMsg = await this.commitService.generateMessage({
          stagedFiles: stagedPaths,
          diffSummary: diffSummary.rawDiff,
          diffSnippet
        });

        if (!isDryRun) {
          const commitArgs = ['commit', '-m', commitMsg.title];
          if (commitMsg.body) {
            commitArgs.push('-m', commitMsg.body);
          }

          const commitRes = await this.git.exec(commitArgs, repoPath);
          if (commitRes.exitCode === 0) {
            commitCreated = true;

            // Fetch newly created commit SHA
            const revRes = await this.git.exec(['rev-parse', 'HEAD'], repoPath);
            commitSha = revRes.stdout.trim();

            // Record in CommitHistoryRepository
            if (this.commitHistoryRepo && commitSha) {
              this.commitHistoryRepo.recordCommit({
                projectId,
                commitSha,
                branch: updatedStatus.branch,
                authorName: 'NIMO-DECK Sync Engine',
                authorEmail: 'deck-sync@local',
                message: `${commitMsg.title}\n\n${commitMsg.body || ''}`.trim(),
                filesChangedCount: stagedPaths.length,
                isAutoGenerated: true
              });
            }
          }
        }
      }

      // 7. Remote Tracking, Safe Pull & Conflict Detection
      const remoteStatus = await this.statusInspector.getRemoteTrackingStatus(repoPath);

      if (remoteStatus.hasRemote) {
        if (remoteStatus.isDiverged) {
          isDiverged = true;
          this.eventBus.emit('sync:conflict_detected', {
            projectId,
            branch: remoteStatus.branch,
            reason: `Branch has diverged (${remoteStatus.ahead} local ahead, ${remoteStatus.behind} remote ahead). Automatic push is halted.`
          });
        } else if (remoteStatus.behind > 0 && remoteStatus.ahead === 0 && !isDryRun) {
          // Safe Fast-Forward Only Pull
          const pullRes = await this.git.exec(['pull', '--ff-only'], repoPath);
          pulled = pullRes.exitCode === 0;
        }

        // 8. Configurable Remote Push Policy
        if (
          autoPushMode === 'ON_COMMIT' &&
          remoteStatus.ahead > 0 &&
          !remoteStatus.isDiverged &&
          !isDryRun
        ) {
          const pushRes = await this.git.exec(['push', 'origin', remoteStatus.branch], repoPath);
          if (pushRes.exitCode === 0) {
            pushed = true;
            this.eventBus.emit('sync:push_succeeded', {
              projectId,
              branch: remoteStatus.branch,
              sha: commitSha || ''
            });
          } else {
            // Push failed (network / temporary remote lock) -> Enqueue in retry queue
            this.eventBus.emit('sync:push_failed', {
              projectId,
              branch: remoteStatus.branch,
              error: pushRes.stderr
            });

            this.retryQueue.enqueue({
              id: `push:${projectId}:${remoteStatus.branch}`,
              projectId,
              repoPath,
              operation: async () => {
                const res = await this.git.exec(['push', 'origin', remoteStatus.branch], repoPath);
                return res.exitCode === 0;
              },
              error: pushRes.stderr
            });
          }
        }

        // Update RemoteSyncStateRepository
        if (this.remoteSyncStateRepo) {
          const headRes = await this.git.exec(['rev-parse', 'HEAD'], repoPath);
          const localHead = headRes.stdout.trim();
          this.remoteSyncStateRepo.upsertState({
            projectId,
            branchName: remoteStatus.branch,
            localHeadSha: localHead,
            remoteHeadSha: localHead, // Reconciled on next fetch
            syncStatus: isDiverged ? 'DIVERGED' : remoteStatus.ahead > 0 ? 'AHEAD' : remoteStatus.behind > 0 ? 'BEHIND' : 'IN_SYNC'
          });
        }
      }

      const durationMs = Date.now() - start;

      // 9. Structured Event Logging
      if (this.syncEventRepo) {
        this.syncEventRepo.logEvent({
          projectId,
          eventType: commitCreated ? 'COMMIT_CREATED' : isDiverged ? 'CONFLICT_DETECTED' : 'BATCH_DEBOUNCED',
          status: 'SUCCESS',
          details: {
            commitCreated,
            commitSha,
            pushed,
            pulled,
            quarantinedCount: quarantinedFiles.length,
            durationMs
          }
        });
      }

      return {
        success: true,
        projectId,
        repoPath,
        commitCreated,
        commitSha,
        pushed,
        pulled,
        quarantinedFiles,
        isDiverged,
        durationMs
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (this.syncEventRepo) {
        this.syncEventRepo.logEvent({
          projectId,
          eventType: 'PUSH_FAILED',
          status: 'FAILED',
          details: { error: errorMessage }
        });
      }

      return {
        success: false,
        projectId,
        repoPath,
        commitCreated,
        pushed,
        pulled,
        quarantinedFiles,
        error: errorMessage,
        durationMs: Date.now() - start
      };
    } finally {
      releaseLock();
    }
  }
}
