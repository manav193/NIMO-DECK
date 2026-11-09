import fs from 'node:fs';
import path from 'node:path';
import { isImmutableIgnored, sha256 } from '@nimo-deck/shared';
import type { ScannedFile } from './types.js';

export class RepoScanner {
  /**
   * Recursively traverses a project directory, strictly excluding
   * ignored dependencies, build outputs, version-control internals, and secret patterns.
   */
  static scan(projectRoot: string): ScannedFile[] {
    const results: ScannedFile[] = [];

    function walk(currentDir: string): void {
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relPath = path.relative(projectRoot, fullPath).replace(/\\/g, '/');

        // Check immutable ignore patterns
        if (isImmutableIgnored(relPath) || isImmutableIgnored(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          try {
            const stat = fs.statSync(fullPath);
            // Skip large binary files > 20MB
            if (stat.size > 20 * 1024 * 1024) continue;

            const buffer = fs.readFileSync(fullPath);
            const hash = sha256(buffer);
            const ext = path.extname(entry.name).toLowerCase();

            results.push({
              relativePath: relPath,
              fullPath,
              sha256: hash,
              sizeBytes: stat.size,
              extension: ext
            });
          } catch {
            // Ignore unreadable files
          }
        }
      }
    }

    walk(projectRoot);
    return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }
}
