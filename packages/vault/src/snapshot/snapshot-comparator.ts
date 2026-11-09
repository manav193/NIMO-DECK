import type { VaultSnapshotManifest } from '@nimo-deck/shared';
import type { SnapshotComparisonResult } from './types.js';

export class SnapshotComparator {
  /**
   * Compares two snapshot manifests and calculates file-level diffs.
   */
  static compare(manifestA: VaultSnapshotManifest, manifestB: VaultSnapshotManifest): SnapshotComparisonResult {
    const mapA = new Map(manifestA.files.map((f) => [f.path, f.sha256]));
    const mapB = new Map(manifestB.files.map((f) => [f.path, f.sha256]));

    const addedFiles: string[] = [];
    const modifiedFiles: string[] = [];
    const deletedFiles: string[] = [];
    const identicalFiles: string[] = [];

    for (const [pathB, hashB] of mapB.entries()) {
      const hashA = mapA.get(pathB);
      if (!hashA) {
        addedFiles.push(pathB);
      } else if (hashA !== hashB) {
        modifiedFiles.push(pathB);
      } else {
        identicalFiles.push(pathB);
      }
    }

    for (const pathA of mapA.keys()) {
      if (!mapB.has(pathA)) {
        deletedFiles.push(pathA);
      }
    }

    return {
      snapshotAId: manifestA.id,
      snapshotBId: manifestB.id,
      addedFiles: addedFiles.sort(),
      modifiedFiles: modifiedFiles.sort(),
      deletedFiles: deletedFiles.sort(),
      identicalFiles: identicalFiles.sort()
    };
  }
}
