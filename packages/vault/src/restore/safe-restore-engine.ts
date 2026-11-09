import fs from 'node:fs';
import path from 'node:path';
import { isImmutableIgnored, sha256 } from '@nimo-deck/shared';
import type {
  RestorePreview,
  VaultSnapshotManifest,
  VaultSnapshot
} from '@nimo-deck/shared';
import type { VaultRepository, AuditLogRepository } from '@nimo-deck/core';
import type { BlobStore } from '../cas/blob-store.js';
import type { SnapshotEngine } from '../snapshot/snapshot-engine.js';

export interface RestoreExecutionParams {
  snapshot: VaultSnapshot;
  manifest: VaultSnapshotManifest;
  projectPath: string;
  confirmRestore: boolean;
  allowOverwriteUncommitted?: boolean;
  allowDeletion?: boolean;
  selectiveFiles?: string[];
}

export interface RestoreResult {
  success: boolean;
  restoredFileCount: number;
  safetySnapshotId: string;
  rolledBack?: boolean;
  error?: string;
}

export class SafeRestoreEngine {
  constructor(
    private blobStore: BlobStore,
    private snapshotEngine: SnapshotEngine,
    private vaultRepo?: VaultRepository,
    private auditRepo?: AuditLogRepository
  ) {}

  /**
   * Generates a preview of the proposed restore operation by comparing
   * snapshot manifest against the current working tree on disk.
   */
  generatePreview(
    manifest: VaultSnapshotManifest,
    projectPath: string,
    selectiveFiles?: string[]
  ): RestorePreview {
    const targetFiles = selectiveFiles
      ? manifest.files.filter((f) => selectiveFiles.includes(f.path))
      : manifest.files;

    const manifestMap = new Map(targetFiles.map((f) => [f.path, f.sha256]));

    const filesToCreate: string[] = [];
    const filesToOverwrite: string[] = [];
    const filesUnchanged: string[] = [];
    const filesToDelete: string[] = [];

    // Check disk files vs manifest
    for (const [relPath, snapHash] of manifestMap.entries()) {
      const fullPath = path.join(projectPath, relPath);
      if (fs.existsSync(fullPath)) {
        try {
          const currentBuffer = fs.readFileSync(fullPath);
          const currentHash = sha256(currentBuffer);
          if (currentHash === snapHash) {
            filesUnchanged.push(relPath);
          } else {
            filesToOverwrite.push(relPath);
          }
        } catch {
          filesToOverwrite.push(relPath);
        }
      } else {
        filesToCreate.push(relPath);
      }
    }

    // Check for local files not in manifest
    const checkDeleted = (dir: string) => {
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        const rel = path.relative(projectPath, full).replace(/\\/g, '/');

        if (isImmutableIgnored(rel) || isImmutableIgnored(ent.name)) {
          continue;
        }

        if (ent.isDirectory()) {
          checkDeleted(full);
        } else if (ent.isFile()) {
          if (!manifestMap.has(rel) && (!selectiveFiles || selectiveFiles.includes(rel))) {
            filesToDelete.push(rel);
          }
        }
      }
    };

    checkDeleted(projectPath);

    const isWorkingTreeDirty = filesToOverwrite.length > 0 || filesToDelete.length > 0;

    return {
      snapshotId: manifest.id,
      targetPath: projectPath,
      filesToCreate: filesToCreate.sort(),
      filesToOverwrite: filesToOverwrite.sort(),
      filesToDelete: filesToDelete.sort(),
      filesUnchanged: filesUnchanged.sort(),
      isWorkingTreeDirty,
      requiresConfirmation: true
    };
  }

  /**
   * Executes safe project restoration with pre-restore safety snapshot and automatic rollback.
   */
  async executeRestore(params: RestoreExecutionParams): Promise<RestoreResult> {
    // 1. Assert explicit user confirmation
    if (!params.confirmRestore) {
      throw new Error(
        'Consequential restore operation requires explicit user confirmation (confirmRestore: true).'
      );
    }

    // 2. Validate CAS blobs integrity before starting
    const targetFiles = params.selectiveFiles
      ? params.manifest.files.filter((f) => params.selectiveFiles!.includes(f.path))
      : params.manifest.files;

    for (const f of targetFiles) {
      if (!this.blobStore.has(f.sha256) || !this.blobStore.verify(f.sha256)) {
        throw new Error(
          `Corrupted snapshot or missing CAS blob: ${f.path} (${f.sha256}). Restoration aborted before modifying disk.`
        );
      }
    }

    // 3. Generate preview & enforce overwrite/delete permissions
    const preview = this.generatePreview(
      params.manifest,
      params.projectPath,
      params.selectiveFiles
    );

    if (preview.filesToOverwrite.length > 0 && !params.allowOverwriteUncommitted) {
      throw new Error(
        `Working tree contains ${preview.filesToOverwrite.length} modified files that would be overwritten. Set allowOverwriteUncommitted: true to proceed.`
      );
    }

    if (preview.filesToDelete.length > 0 && !params.allowDeletion) {
      throw new Error(
        `Restoration would delete ${preview.filesToDelete.length} unmapped files. Set allowDeletion: true to authorize deletion.`
      );
    }

    // 4. Capture Pre-Restore Safety Snapshot of current working tree
    const safetyResult = await this.snapshotEngine.createSnapshot({
      projectId: params.snapshot.projectId,
      projectPath: params.projectPath,
      description: `Safety pre-restore rollback point prior to restoring snapshot ${params.snapshot.id.slice(0, 8)}`,
      snapshotType: 'SAFETY_PRE_RESTORE',
      isPinned: true
    });

    const safetySnapshotId = safetyResult.snapshot.id;

    // Log initiation
    if (this.auditRepo) {
      this.auditRepo.appendLog({
        projectId: params.snapshot.projectId,
        actor: 'USER',
        action: 'VAULT_RESTORE_INITIATED',
        payload: {
          targetSnapshotId: params.snapshot.id,
          safetySnapshotId,
          selectiveFiles: params.selectiveFiles
        }
      });
    }

    // 5. Apply restore with try/catch rollback guard
    let restoredCount = 0;
    try {
      // Write files from CAS
      for (const f of targetFiles) {
        // Path traversal defense
        const normalizedRel = path.normalize(f.path).replace(/^(\.\.(\/|\\|$))+/, '');
        const targetPath = path.resolve(params.projectPath, normalizedRel);

        if (!targetPath.startsWith(path.resolve(params.projectPath))) {
          throw new Error(`Path traversal exploit detected: ${f.path}`);
        }

        const dir = path.dirname(targetPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const buffer = this.blobStore.read(f.sha256);
        fs.writeFileSync(targetPath, buffer);
        restoredCount++;
      }

      // Handle file deletions if authorized
      if (params.allowDeletion && !params.selectiveFiles) {
        for (const delRel of preview.filesToDelete) {
          const targetPath = path.join(params.projectPath, delRel);
          if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
          }
        }
      }

      if (this.vaultRepo) {
        this.vaultRepo.logRestoreOperation({
          projectId: params.snapshot.projectId,
          snapshotId: params.snapshot.id,
          safetySnapshotId,
          status: 'COMPLETED',
          details: {
            restoredCount,
            preview
          }
        });
      }

      if (this.auditRepo) {
        this.auditRepo.appendLog({
          projectId: params.snapshot.projectId,
          actor: 'USER',
          action: 'VAULT_RESTORE_COMPLETED',
          payload: {
            snapshotId: params.snapshot.id,
            restoredCount
          }
        });
      }

      return {
        success: true,
        restoredFileCount: restoredCount,
        safetySnapshotId
      };
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);

      // Automatic rollback to safety snapshot
      try {
        for (const sf of safetyResult.manifest.files) {
          const targetPath = path.join(params.projectPath, sf.path);
          const dir = path.dirname(targetPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const buf = this.blobStore.read(sf.sha256);
          fs.writeFileSync(targetPath, buf);
        }
      } catch {
        // Rollback attempt failed
      }

      if (this.vaultRepo) {
        this.vaultRepo.logRestoreOperation({
          projectId: params.snapshot.projectId,
          snapshotId: params.snapshot.id,
          safetySnapshotId,
          status: 'ROLLED_BACK',
          details: { error: errMessage }
        });
      }

      if (this.auditRepo) {
        this.auditRepo.appendLog({
          projectId: params.snapshot.projectId,
          actor: 'SYSTEM',
          action: 'VAULT_RESTORE_ROLLED_BACK',
          payload: { error: errMessage, safetySnapshotId }
        });
      }

      return {
        success: false,
        restoredFileCount: 0,
        safetySnapshotId,
        rolledBack: true,
        error: errMessage
      };
    }
  }
}
