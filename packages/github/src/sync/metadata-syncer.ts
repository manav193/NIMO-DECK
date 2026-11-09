import type { GitHubClient } from '../client/github-client.js';
import { RepoUrlParser } from '../mapper/repo-url-parser.js';
import type {
  Project,
  GitHubRepo,
  GitHubBranch,
  GitHubPullRequest,
  GitHubIssue
} from '@nimo-deck/shared';
import type { RemoteSyncStateRepository } from '@nimo-deck/core';

export interface SyncedProjectMetadata {
  project: Project;
  repo: GitHubRepo | null;
  branches: GitHubBranch[];
  openPullRequests: GitHubPullRequest[];
  openIssues: GitHubIssue[];
  syncedAt: Date;
}

export class GitHubMetadataSyncer {
  constructor(
    private client: GitHubClient,
    private remoteSyncStateRepo?: RemoteSyncStateRepository
  ) {}

  /**
   * Syncs metadata, branches, PRs, and issues for a single local project with a GitHub remote.
   */
  async syncProject(project: Project): Promise<SyncedProjectMetadata | null> {
    if (!project.gitRemoteUrl) {
      return null;
    }

    const parsed = RepoUrlParser.parse(project.gitRemoteUrl);
    if (!parsed) {
      return null;
    }

    const [repo, branches, openPullRequests, openIssues] = await Promise.all([
      this.client.getRepo(parsed.owner, parsed.repo),
      this.client.getBranches(parsed.owner, parsed.repo),
      this.client.getPullRequests(parsed.owner, parsed.repo, 'open'),
      this.client.getIssues(parsed.owner, parsed.repo, 'open')
    ]);

    // Update remote sync states in local database for all active branches
    if (this.remoteSyncStateRepo) {
      for (const branch of branches) {
        const existing = this.remoteSyncStateRepo.getState(project.id, branch.name);
        const localHead = existing ? existing.localHeadSha : branch.commitSha;
        const syncStatus = localHead === branch.commitSha ? 'IN_SYNC' : 'BEHIND';

        this.remoteSyncStateRepo.upsertState({
          projectId: project.id,
          branchName: branch.name,
          localHeadSha: localHead,
          remoteHeadSha: branch.commitSha,
          syncStatus
        });
      }
    }

    return {
      project,
      repo,
      branches,
      openPullRequests,
      openIssues,
      syncedAt: new Date()
    };
  }
}
