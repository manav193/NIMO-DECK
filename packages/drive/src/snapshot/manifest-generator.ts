import { sha256, type SnapshotManifest } from '@nimo-deck/shared';
import { LoopGuard } from './loop-guard.js';

export class ManifestGenerator {
  /**
   * Generates a deterministic SnapshotManifest with an embedded sync loop prevention token.
   */
  static generate(params: {
    projectId: string;
    projectName: string;
    files: { relativePath: string; sha256: string; size: number }[];
    gitCommitSha?: string;
  }): SnapshotManifest {
    // Sort files deterministically by relative path
    const sorted = [...params.files].sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    const totalSizeBytes = sorted.reduce((acc, f) => acc + f.size, 0);
    const contentSignatures = sorted.map((f) => `${f.relativePath}:${f.sha256}:${f.size}`).join('\n');
    const manifestSha256 = sha256(contentSignatures);
    const syncToken = LoopGuard.generateSyncToken();

    return {
      version: '1.0',
      projectId: params.projectId,
      projectName: params.projectName,
      snapshotTimestamp: new Date().toISOString(),
      gitCommitSha: params.gitCommitSha,
      fileCount: sorted.length,
      totalSizeBytes,
      manifestSha256,
      syncToken
    };
  }
}
