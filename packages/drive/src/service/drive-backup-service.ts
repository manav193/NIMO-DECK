import { GoogleDriveClient } from '../client/drive-client.js';
import { SnapshotBuilder } from '../snapshot/snapshot-builder.js';
import { ProjectDocsMirror } from '../docs/docs-mirror.js';
import { RestoreEngine } from '../restore/restore-engine.js';
import {
  DeckDatabase,
  driveBackups,
  DeckEventBus,
  type SyncEventRepository,
  type ProjectRepository
} from '@nimo-deck/core';
import { eq, desc } from 'drizzle-orm';
import crypto from 'node:crypto';
import type { DriveBackup } from '@nimo-deck/shared';

export interface DriveBackupServiceOptions {
  driveClient: GoogleDriveClient;
  db?: DeckDatabase;
  projectRepo?: ProjectRepository;
  syncEventRepo?: SyncEventRepository;
  eventBus?: DeckEventBus;
}

export class DriveBackupService {
  private client: GoogleDriveClient;
  private db?: DeckDatabase;
  private syncEventRepo?: SyncEventRepository;
  private eventBus: DeckEventBus;
  private docsMirror: ProjectDocsMirror;

  constructor(options: DriveBackupServiceOptions) {
    this.client = options.driveClient;
    this.db = options.db;
    this.syncEventRepo = options.syncEventRepo;
    this.eventBus = options.eventBus ?? DeckEventBus.getInstance();
    this.docsMirror = new ProjectDocsMirror(this.client);
  }

  /**
   * Retrieves the latest completed backup for a project.
   */
  getLatestBackup(projectId: string): DriveBackup | null {
    if (!this.db) return null;

    const row = this.db
      .select()
      .from(driveBackups)
      .where(eq(driveBackups.projectId, projectId))
      .orderBy(desc(driveBackups.createdAt))
      .limit(1)
      .get();

    if (!row) return null;

    return {
      id: row.id,
      projectId: row.projectId,
      driveFileId: row.driveFileId,
      driveFolderId: row.driveFolderId,
      snapshotSha256: row.snapshotSha256,
      sizeBytes: row.sizeBytes,
      backupType: row.backupType,
      status: row.status,
      createdAt: row.createdAt
    };
  }

  /**
   * Creates and uploads a full, versioned backup snapshot to Google Drive with duplicate prevention.
   */
  async createSnapshot(params: {
    projectId: string;
    projectName: string;
    projectPath: string;
    gitCommitSha?: string;
    force?: boolean;
  }): Promise<{
    backup: DriveBackup | null;
    skippedAsDuplicate: boolean;
    uploadResult?: { fileId: string; webViewLink?: string };
  }> {
    // 1. Build sanitized in-memory snapshot
    const build = SnapshotBuilder.buildSnapshot({
      projectId: params.projectId,
      projectName: params.projectName,
      projectPath: params.projectPath,
      gitCommitSha: params.gitCommitSha
    });

    // 2. Duplicate prevention check based on manifest file content digest
    const latest = this.getLatestBackup(params.projectId);
    if (!params.force && latest && latest.snapshotSha256 === build.manifest.manifestSha256) {
      return {
        backup: latest,
        skippedAsDuplicate: true
      };
    }

    // 3. Ensure Google Drive folder hierarchy exists
    const folders = await this.client.ensureProjectStructure(params.projectName);

    // 4. Format timestamped filename: snapshot-YYYY-MM-DD-HHmmss.zip
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `snapshot-${timestampStr}.zip`;

    // 5. Upload to Google Drive snapshots folder
    const uploadRes = await this.client.uploadFile({
      name: fileName,
      content: build.zipBuffer,
      mimeType: 'application/zip',
      parentId: folders.snapshotsFolderId
    });

    // 6. Record backup in local database
    const backupId = crypto.randomUUID();
    const now = new Date();

    if (this.db) {
      this.db
        .insert(driveBackups)
        .values({
          id: backupId,
          projectId: params.projectId,
          driveFileId: uploadRes.fileId,
          driveFolderId: folders.snapshotsFolderId,
          snapshotSha256: build.manifest.manifestSha256,
          sizeBytes: build.zipBuffer.length,
          backupType: 'SNAPSHOT',
          status: 'COMPLETED',
          createdAt: now
        })
        .run();
    }

    const backupRecord: DriveBackup = {
      id: backupId,
      projectId: params.projectId,
      driveFileId: uploadRes.fileId,
      driveFolderId: folders.snapshotsFolderId,
      snapshotSha256: build.manifest.manifestSha256,
      sizeBytes: build.zipBuffer.length,
      backupType: 'SNAPSHOT',
      status: 'COMPLETED',
      createdAt: now
    };

    if (this.syncEventRepo) {
      this.syncEventRepo.logEvent({
        projectId: params.projectId,
        eventType: 'BATCH_DEBOUNCED',
        status: 'SUCCESS',
        details: {
          action: 'DRIVE_SNAPSHOT_CREATED',
          fileName,
          sizeBytes: build.zipBuffer.length,
          driveFileId: uploadRes.fileId
        }
      });
    }

    this.eventBus.emit('drive:backup_created', backupRecord);

    return {
      backup: backupRecord,
      skippedAsDuplicate: false,
      uploadResult: uploadRes
    };
  }

  /**
   * Mirrors project documentation to Google Drive.
   */
  async mirrorDocumentation(params: {
    projectId: string;
    projectName: string;
    projectPath: string;
  }) {
    const folders = await this.client.ensureProjectStructure(params.projectName);
    return this.docsMirror.mirrorDocs(params.projectPath, folders.docsFolderId);
  }

  /**
   * Downloads a backup snapshot from Google Drive and restores it safely.
   */
  async restoreSnapshot(params: {
    projectId: string;
    driveFileId: string;
    expectedArchiveSha256?: string;
    targetDirectory: string;
    confirmRestore: boolean;
  }) {
    const zipBuffer = await this.client.downloadFile(params.driveFileId);

    return RestoreEngine.restoreSnapshot(zipBuffer, {
      targetDirectory: params.targetDirectory,
      expectedArchiveSha256: params.expectedArchiveSha256,
      confirmRestore: params.confirmRestore
    });
  }
}
