import type { ScannedFile } from './types.js';

export interface IncrementalDiff {
  added: ScannedFile[];
  modified: ScannedFile[];
  deleted: string[];
  unchanged: ScannedFile[];
  hasChanges: boolean;
}

export class ContentHashCache {
  private cache = new Map<string, string>(); // relativePath -> sha256

  constructor(initialEntries?: Record<string, string>) {
    if (initialEntries) {
      for (const [path, hash] of Object.entries(initialEntries)) {
        this.cache.set(path, hash);
      }
    }
  }

  /**
   * Compares currently discovered files against previous cache to produce an incremental diff.
   */
  diff(currentFiles: ScannedFile[]): IncrementalDiff {
    const currentPaths = new Set(currentFiles.map((f) => f.relativePath));
    const added: ScannedFile[] = [];
    const modified: ScannedFile[] = [];
    const unchanged: ScannedFile[] = [];
    const deleted: string[] = [];

    for (const file of currentFiles) {
      const prevHash = this.cache.get(file.relativePath);
      if (!prevHash) {
        added.push(file);
      } else if (prevHash !== file.sha256) {
        modified.push(file);
      } else {
        unchanged.push(file);
      }
    }

    for (const [prevPath] of this.cache.entries()) {
      if (!currentPaths.has(prevPath)) {
        deleted.push(prevPath);
      }
    }

    const hasChanges = added.length > 0 || modified.length > 0 || deleted.length > 0;
    return { added, modified, deleted, unchanged, hasChanges };
  }

  /**
   * Updates internal cache with current files.
   */
  update(currentFiles: ScannedFile[]): void {
    this.cache.clear();
    for (const f of currentFiles) {
      this.cache.set(f.relativePath, f.sha256);
    }
  }

  export(): Record<string, string> {
    return Object.fromEntries(this.cache.entries());
  }
}
