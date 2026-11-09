import fs from 'node:fs';
import type { ScannedFile } from './types.js';

export class DocExtractor {
  /**
   * Extracts project documentation from markdown files.
   */
  static extract(files: ScannedFile[], maxDocs = 10, maxCharsPerDoc = 10000): Array<{ path: string; content: string }> {
    const docs: Array<{ path: string; content: string }> = [];

    // Prioritize README, ARCHITECTURE, and main docs
    const docFiles = files
      .filter((f) => {
        const lower = f.relativePath.toLowerCase();
        return (
          lower === 'readme.md' ||
          lower.startsWith('docs/') ||
          lower.includes('contributing') ||
          lower.includes('architecture') ||
          f.extension === '.md'
        );
      })
      .sort((a, b) => {
        if (a.relativePath.toLowerCase() === 'readme.md') return -1;
        if (b.relativePath.toLowerCase() === 'readme.md') return 1;
        return a.relativePath.localeCompare(b.relativePath);
      })
      .slice(0, maxDocs);

    for (const f of docFiles) {
      try {
        const raw = fs.readFileSync(f.fullPath, 'utf8');
        const truncated = raw.length > maxCharsPerDoc ? `${raw.slice(0, maxCharsPerDoc)}\n...[TRUNCATED]` : raw;
        docs.push({
          path: f.relativePath,
          content: truncated
        });
      } catch {
        // Skip unreadable files
      }
    }

    return docs;
  }
}
