import { describe, it, expect } from 'vitest';
import { SnapshotComparator } from '../src/snapshot/snapshot-comparator.js';
import type { VaultSnapshotManifest } from '@nimo-deck/shared';

describe('@nimo-deck/vault: SnapshotComparator', () => {
  it('should accurately detect added, modified, deleted, and identical files', () => {
    const manifestA: VaultSnapshotManifest = {
      id: 'snap-A',
      projectId: 'proj-1',
      snapshotType: 'FULL',
      rootHash: 'hash-a',
      files: [
        { path: 'src/main.ts', sha256: 'hash-main-v1', sizeBytes: 100, state: 'COMMITTED' },
        { path: 'docs/guide.md', sha256: 'hash-guide-same', sizeBytes: 50, state: 'COMMITTED' },
        { path: 'old-util.ts', sha256: 'hash-old', sizeBytes: 30, state: 'COMMITTED' }
      ],
      createdAt: new Date('2026-11-01T10:00:00Z')
    };

    const manifestB: VaultSnapshotManifest = {
      id: 'snap-B',
      projectId: 'proj-1',
      snapshotType: 'FULL',
      rootHash: 'hash-b',
      files: [
        { path: 'src/main.ts', sha256: 'hash-main-v2', sizeBytes: 120, state: 'COMMITTED' },
        { path: 'docs/guide.md', sha256: 'hash-guide-same', sizeBytes: 50, state: 'COMMITTED' },
        { path: 'src/new-feature.ts', sha256: 'hash-new', sizeBytes: 80, state: 'COMMITTED' }
      ],
      createdAt: new Date('2026-11-02T10:00:00Z')
    };

    const diff = SnapshotComparator.compare(manifestA, manifestB);

    expect(diff.snapshotAId).toBe('snap-A');
    expect(diff.snapshotBId).toBe('snap-B');
    expect(diff.identicalFiles).toEqual(['docs/guide.md']);
    expect(diff.modifiedFiles).toEqual(['src/main.ts']);
    expect(diff.addedFiles).toEqual(['src/new-feature.ts']);
    expect(diff.deletedFiles).toEqual(['old-util.ts']);
  });
});
