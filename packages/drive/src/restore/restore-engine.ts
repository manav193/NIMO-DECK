import path from 'node:path';
import AdmZip from 'adm-zip';
import { sha256, type SnapshotManifest } from '@nimo-deck/shared';

export interface RestoreOptions {
  targetDirectory: string;
  expectedArchiveSha256?: string;
  confirmRestore: boolean; // Must be explicitly true
}

export interface RestoreResult {
  success: boolean;
  targetDirectory: string;
  restoredFilesCount: number;
  manifest: SnapshotManifest | null;
  durationMs: number;
}

export class RestoreEngine {
  /**
   * Safely restores a project snapshot archive into the target directory with integrity verification.
   */
  static restoreSnapshot(
    zipBuffer: Buffer,
    options: RestoreOptions
  ): RestoreResult {
    const start = Date.now();

    // 1. Explicit user confirmation requirement
    if (!options.confirmRestore) {
      throw new Error(
        '[NIMO-DECK Restore Guard] Restore rejected: confirmRestore must be explicitly true to authorize filesystem modifications.'
      );
    }

    // 2. Cryptographic SHA-256 archive integrity check
    if (options.expectedArchiveSha256) {
      const actualSha = sha256(zipBuffer);
      if (actualSha !== options.expectedArchiveSha256) {
        throw new Error(
          `[NIMO-DECK Restore Integrity Error] Checksum mismatch: expected ${options.expectedArchiveSha256}, calculated ${actualSha}. Archive is corrupted or tampered.`
        );
      }
    }

    // 3. Inspect ZIP entries for path traversal protection
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();
    const resolvedTarget = path.resolve(options.targetDirectory);

    let manifest: SnapshotManifest | null = null;
    let restoredFilesCount = 0;

    for (const entry of entries) {
      const entryName = entry.entryName;

      // Extract manifest
      if (entryName === 'deck-sync-manifest.json') {
        try {
          manifest = JSON.parse(entry.getData().toString('utf8')) as SnapshotManifest;
        } catch {
          // Fall through
        }
        continue;
      }

      // Path traversal check
      const destinationPath = path.resolve(resolvedTarget, entryName);
      if (!destinationPath.startsWith(resolvedTarget)) {
        throw new Error(
          `[NIMO-DECK Security Violation] Path traversal detected in archive entry: "${entryName}". Restore aborted.`
        );
      }

      if (!entry.isDirectory) {
        zip.extractEntryTo(entry, resolvedTarget, true, true);
        restoredFilesCount++;
      }
    }

    return {
      success: true,
      targetDirectory: resolvedTarget,
      restoredFilesCount,
      manifest,
      durationMs: Date.now() - start
    };
  }
}
