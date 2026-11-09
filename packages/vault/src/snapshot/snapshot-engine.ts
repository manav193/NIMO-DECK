import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { isImmutableIgnored, sha256 } from '@nimo-deck/shared';
import type {
  VaultSnapshotManifest,
  SnapshotFileEntry,
  SnapshotFileState,
  SnapshotType,
  VaultSnapshot
} from '@nimo-deck/shared';
import type { VaultRepository } from '@nimo-deck/core';
import { GitCLI } from '@nimo-deck/sync';
import type { BlobStore } from '../cas/blob-store.js';
import type { SnapshotBuildResult, SnapshotCreateOptions } from './types.js';

export class SnapshotEngine {
  constructor(
    private blobStore: BlobStore,
    private vaultRepo?: VaultRepository
  ) {}

  /**
   * Captures a complete or differential working tree snapshot without modifying
   * any files in the workspace.
   */
  async createSnapshot(options: SnapshotCreateOptions): Promise<SnapshotBuildResult> {
    const cli = new GitCLI(options.projectPath);
    const isGit = await cli.isGitRepo();
    const git = isGit ? cli : null;

    let branch = 'main';
    let commitSha = options.gitCommitSha;
    let stagedPatch = '';
    let unstagedPatch = '';

    if (git) {
      try {
        const branchRes = await git.exec(['rev-parse', '--abbrev-ref', 'HEAD']);
        branch = branchRes.stdout.trim() || 'main';

        if (!commitSha) {
          const revRes = await git.exec(['rev-parse', 'HEAD']);
          commitSha = revRes.stdout.trim();
        }

        const stagedRes = await git.exec(['diff', '--cached']);
        stagedPatch = stagedRes.stdout;

        const unstagedRes = await git.exec(['diff']);
        unstagedPatch = unstagedRes.stdout;
      } catch {
        // Fallback for empty or initialized repos
      }
    }

    // 1. Recursive file discovery excluding immutable ignored patterns
    const fileEntries: SnapshotFileEntry[] = [];
    let newBlobsCount = 0;
    let dedupBlobsCount = 0;
    let totalSizeBytes = 0;

    const walk = (currentDir: string) => {
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const ent of entries) {
        const fullPath = path.join(currentDir, ent.name);
        const rel = path.relative(options.projectPath, fullPath).replace(/\\/g, '/');

        if (isImmutableIgnored(rel) || isImmutableIgnored(ent.name)) {
          continue;
        }

        if (ent.isDirectory()) {
          walk(fullPath);
        } else if (ent.isFile()) {
          try {
            const stat = fs.statSync(fullPath);
            // Skip large binary files > 50MB
            if (stat.size > 50 * 1024 * 1024) continue;

            const buffer = fs.readFileSync(fullPath);
            const storeRes = this.blobStore.store(buffer);

            if (storeRes.wasNew) {
              newBlobsCount++;
            } else {
              dedupBlobsCount++;
            }

            totalSizeBytes += stat.size;

            let fileState: SnapshotFileState = 'COMMITTED';
            if (stagedPatch.includes(rel)) fileState = 'STAGED';
            else if (unstagedPatch.includes(rel)) fileState = 'UNSTAGED';

            fileEntries.push({
              path: rel,
              sizeBytes: stat.size,
              sha256: storeRes.hash,
              state: fileState
            });
          } catch {
            // Ignore unreadable files
          }
        }
      }
    };

    walk(options.projectPath);
    fileEntries.sort((a, b) => a.path.localeCompare(b.path));

    // 2. Compute root Merkle / manifest content digest
    const rootDigestPayload = fileEntries.map((f) => `${f.path}:${f.sha256}:${f.sizeBytes}`).join('\n');
    const rootHash = sha256(Buffer.from(rootDigestPayload, 'utf8'));

    const snapshotId = crypto.randomUUID();
    const now = new Date();
    const snapType: SnapshotType = options.snapshotType || 'FULL';

    const manifest: VaultSnapshotManifest = {
      id: snapshotId,
      projectId: options.projectId,
      snapshotType: snapType,
      parentSnapshotId: options.parentSnapshotId,
      commitSha,
      branch,
      rootHash,
      files: fileEntries,
      stagedPatch: stagedPatch || undefined,
      unstagedPatch: unstagedPatch || undefined,
      description: options.description,
      createdAt: now
    };

    const manifestJson = JSON.stringify(manifest, null, 2);
    const unifiedPatch = [
      stagedPatch ? `### STAGED CHANGES\n${stagedPatch}` : '',
      unstagedPatch ? `### UNSTAGED CHANGES\n${unstagedPatch}` : ''
    ]
      .filter(Boolean)
      .join('\n\n');

    let saved: VaultSnapshot = {
      id: snapshotId,
      projectId: options.projectId,
      commitSha,
      patchData: unifiedPatch,
      description: options.description,
      snapshotType: snapType,
      parentSnapshotId: options.parentSnapshotId,
      rootHash,
      manifestJson,
      fileCount: fileEntries.length,
      sizeBytes: totalSizeBytes,
      isPinned: Boolean(options.isPinned),
      createdAt: now
    };

    if (this.vaultRepo) {
      saved = this.vaultRepo.saveSnapshot({
        projectId: options.projectId,
        description: options.description,
        patchData: unifiedPatch,
        commitSha,
        snapshotType: snapType,
        parentSnapshotId: options.parentSnapshotId,
        rootHash,
        manifestJson,
        fileCount: fileEntries.length,
        sizeBytes: totalSizeBytes,
        isPinned: options.isPinned
      });
    }

    return {
      snapshot: saved,
      manifest,
      newBlobsStored: newBlobsCount,
      deduplicatedBlobs: dedupBlobsCount
    };
  }
}
