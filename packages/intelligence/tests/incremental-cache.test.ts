import { describe, it, expect } from 'vitest';
import { ContentHashCache } from '../src/ingestion/content-hash-cache.js';
import type { ScannedFile } from '../src/ingestion/types.js';

describe('@nimo-deck/intelligence: Content Hash Cache & Incremental Indexing', () => {
  it('should detect added, modified, unchanged, and deleted files across scans', () => {
    const file1: ScannedFile = {
      relativePath: 'src/index.ts',
      fullPath: '/repo/src/index.ts',
      sha256: 'hash-v1',
      sizeBytes: 100,
      extension: '.ts'
    };

    const file2: ScannedFile = {
      relativePath: 'src/utils.ts',
      fullPath: '/repo/src/utils.ts',
      sha256: 'hash-utils',
      sizeBytes: 200,
      extension: '.ts'
    };

    const cache = new ContentHashCache();

    // Initial scan
    const initialDiff = cache.diff([file1, file2]);
    expect(initialDiff.hasChanges).toBe(true);
    expect(initialDiff.added.length).toBe(2);
    expect(initialDiff.modified.length).toBe(0);

    // Populate cache
    cache.update([file1, file2]);

    // Rescan with file1 modified, file2 unchanged, and file3 added
    const file1Mod: ScannedFile = { ...file1, sha256: 'hash-v2' };
    const file3: ScannedFile = {
      relativePath: 'src/new.ts',
      fullPath: '/repo/src/new.ts',
      sha256: 'hash-new',
      sizeBytes: 150,
      extension: '.ts'
    };

    const secondDiff = cache.diff([file1Mod, file2, file3]);
    expect(secondDiff.hasChanges).toBe(true);
    expect(secondDiff.added.length).toBe(1);
    expect(secondDiff.added[0].relativePath).toBe('src/new.ts');
    expect(secondDiff.modified.length).toBe(1);
    expect(secondDiff.modified[0].relativePath).toBe('src/index.ts');
    expect(secondDiff.unchanged.length).toBe(1);
    expect(secondDiff.unchanged[0].relativePath).toBe('src/utils.ts');

    // Rescan where file2 is deleted
    cache.update([file1Mod, file2, file3]);
    const thirdDiff = cache.diff([file1Mod, file3]);
    expect(thirdDiff.deleted).toContain('src/utils.ts');
  });
});
