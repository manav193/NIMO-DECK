import type { DeckDatabase, DeckEventBus } from '@nimo-deck/core';
import {
  AuditLogRepository,
  VaultRepository
} from '@nimo-deck/core';
import type {
  ChangelogRecord,
  RestorePreview,
  VaultSnapshotManifest,
  TimelineEvent,
  VaultSnapshot
} from '@nimo-deck/shared';
import type { AIProviderAdapter } from '@nimo-deck/intelligence';
import type { DriveBackupService } from '@nimo-deck/drive';

import { BlobStore } from '../cas/blob-store.js';
import { AuditRecorder } from '../audit/audit-recorder.js';
import type { AuditVerificationReport } from '../audit/audit-verifier.js';
import { AuditQueryService, type AuditQueryFilter } from '../audit/audit-query-service.js';
import { SnapshotEngine } from '../snapshot/snapshot-engine.js';
import { SnapshotComparator } from '../snapshot/snapshot-comparator.js';
import type { SnapshotComparisonResult, SnapshotCreateOptions } from '../snapshot/types.js';
import { SafeRestoreEngine, type RestoreResult } from '../restore/safe-restore-engine.js';
import { ProjectTimelineService, type TimelineFilter } from '../timeline/timeline-service.js';
import { ChangelogGenerator, type GenerateChangelogOptions } from '../changelog/changelog-generator.js';
import { DriveVaultIntegration } from '../drive-vault/drive-vault-integration.js';
import { VaultRetentionManager, type RetentionPolicy, type PruneResult } from '../retention/retention-manager.js';

export interface DeckVaultConfig {
  db: DeckDatabase;
  vaultDir: string;
  eventBus?: DeckEventBus;
  driveBackupService?: DriveBackupService;
  aiProvider?: AIProviderAdapter;
}

export class DeckVaultEngine {
  private auditRepo: AuditLogRepository;
  private vaultRepo: VaultRepository;
  private blobStore: BlobStore;

  // Subsystems
  readonly auditRecorder: AuditRecorder;
  readonly auditQuery: AuditQueryService;
  readonly snapshotEngine: SnapshotEngine;
  readonly restoreEngine: SafeRestoreEngine;
  readonly timelineService: ProjectTimelineService;
  readonly changelogGenerator: ChangelogGenerator;
  readonly retentionManager: VaultRetentionManager;
  readonly driveVault?: DriveVaultIntegration;

  constructor(private config: DeckVaultConfig) {
    this.auditRepo = new AuditLogRepository(config.db);
    this.vaultRepo = new VaultRepository(config.db);
    this.blobStore = new BlobStore(config.vaultDir);

    this.auditRecorder = new AuditRecorder(this.auditRepo);
    this.auditQuery = new AuditQueryService(this.auditRepo);
    this.snapshotEngine = new SnapshotEngine(this.blobStore, this.vaultRepo);
    this.restoreEngine = new SafeRestoreEngine(
      this.blobStore,
      this.snapshotEngine,
      this.vaultRepo,
      this.auditRepo
    );
    this.timelineService = new ProjectTimelineService(config.db);
    this.changelogGenerator = new ChangelogGenerator(this.vaultRepo);
    this.retentionManager = new VaultRetentionManager(this.vaultRepo, this.blobStore);

    if (config.driveBackupService) {
      this.driveVault = new DriveVaultIntegration(config.driveBackupService, this.vaultRepo);
    }
  }

  // === SNAPSHOTS ===
  async createSnapshot(options: SnapshotCreateOptions) {
    const result = await this.snapshotEngine.createSnapshot(options);
    this.auditRecorder.record({
      projectId: options.projectId,
      actor: 'SYSTEM',
      action: 'VAULT_SNAPSHOT_CREATED',
      payload: {
        snapshotId: result.snapshot.id,
        type: result.snapshot.snapshotType,
        fileCount: result.snapshot.fileCount,
        rootHash: result.snapshot.rootHash
      }
    });
    return result;
  }

  getSnapshot(id: string): VaultSnapshot | null {
    return this.vaultRepo.getSnapshot(id);
  }

  listSnapshots(projectId: string, limit = 50): VaultSnapshot[] {
    return this.vaultRepo.listSnapshots(projectId, limit);
  }

  compareSnapshots(manifestA: VaultSnapshotManifest, manifestB: VaultSnapshotManifest): SnapshotComparisonResult {
    return SnapshotComparator.compare(manifestA, manifestB);
  }

  // === SAFE RESTORATION ===
  generateRestorePreview(
    manifest: VaultSnapshotManifest,
    projectPath: string,
    selectiveFiles?: string[]
  ): RestorePreview {
    return this.restoreEngine.generatePreview(manifest, projectPath, selectiveFiles);
  }

  async restoreSnapshot(params: {
    snapshot: VaultSnapshot;
    manifest: VaultSnapshotManifest;
    projectPath: string;
    confirmRestore: boolean;
    allowOverwriteUncommitted?: boolean;
    allowDeletion?: boolean;
    selectiveFiles?: string[];
  }): Promise<RestoreResult> {
    return this.restoreEngine.executeRestore(params);
  }

  // === TIMELINE ===
  getTimeline(filter: TimelineFilter): TimelineEvent[] {
    return this.timelineService.getProjectTimeline(filter);
  }

  // === CHANGELOGS ===
  async generateChangelog(options: GenerateChangelogOptions): Promise<ChangelogRecord> {
    const res = await this.changelogGenerator.generateChangelog({
      ...options,
      aiProvider: options.aiProvider || this.config.aiProvider
    });

    this.auditRecorder.record({
      projectId: options.projectId,
      actor: 'USER',
      action: 'VAULT_CHANGELOG_GENERATED',
      payload: { version: options.version, title: options.title }
    });

    return res;
  }

  // === AUDIT & VERIFICATION ===
  verifyAuditChain(projectId?: string): AuditVerificationReport {
    return this.auditQuery.verifyChain(projectId);
  }

  queryAuditLogs(filter: AuditQueryFilter = {}) {
    return this.auditQuery.query(filter);
  }

  // === RETENTION ===
  applyRetention(projectId: string, policy?: RetentionPolicy): PruneResult {
    return this.retentionManager.applyRetention(projectId, policy);
  }

  getBlobStore(): BlobStore {
    return this.blobStore;
  }
}
