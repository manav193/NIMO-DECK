import fs from 'node:fs';
import path from 'node:path';
import type { ManifestSummary, ScannedFile } from './types.js';

export class ManifestAnalyzer {
  /**
   * Scans discovered files for package manifests and extracts structured dependency information.
   */
  static analyze(files: ScannedFile[]): ManifestSummary[] {
    const manifests: ManifestSummary[] = [];

    for (const f of files) {
      const fileName = path.basename(f.relativePath);
      if (fileName === 'package.json') {
        try {
          const raw = fs.readFileSync(f.fullPath, 'utf8');
          const json = JSON.parse(raw);
          manifests.push({
            name: json.name,
            version: json.version,
            dependencies: json.dependencies || {},
            devDependencies: json.devDependencies || {},
            scripts: json.scripts || {},
            engines: json.engines
          });
        } catch {
          // Skip invalid JSON
        }
      }
    }

    return manifests;
  }
}
