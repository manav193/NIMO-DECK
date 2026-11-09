import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { isImmutableIgnored, sha256, type SnapshotManifest } from '@nimo-deck/shared';
import { ManifestGenerator } from './manifest-generator.js';

export interface SnapshotBuildResult {
  zipBuffer: Buffer;
  archiveSha256: string;
  manifest: SnapshotManifest;
  fileCount: number;
  totalSizeBytes: number;
}

export class SnapshotBuilder {
  /**
   * Recursively discovers all safe project files, excluding immutable ignored patterns.
   */
  static collectSafeFiles(dir: string, baseDir: string = dir): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

      if (isImmutableIgnored(relPath) || isImmutableIgnored(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        results.push(...this.collectSafeFiles(fullPath, baseDir));
      } else if (entry.isFile()) {
        results.push(relPath);
      }
    }

    return results;
  }

  /**
   * Builds an in-memory ZIP snapshot archive containing safe files and the deck-sync-manifest.json.
   */
  static buildSnapshot(params: {
    projectId: string;
    projectName: string;
    projectPath: string;
    gitCommitSha?: string;
  }): SnapshotBuildResult {
    const relPaths = this.collectSafeFiles(params.projectPath);
    const zip = new AdmZip();

    const fileMeta: { relativePath: string; sha256: string; size: number }[] = [];

    for (const rel of relPaths) {
      const fullPath = path.join(params.projectPath, rel);
      const buffer = fs.readFileSync(fullPath);
      const hash = sha256(buffer);

      fileMeta.push({
        relativePath: rel,
        sha256: hash,
        size: buffer.length
      });

      // Add file to ZIP preserving relative path
      zip.addFile(rel, buffer);
    }

    // Generate manifest with unique sync loop prevention token
    const manifest = ManifestGenerator.generate({
      projectId: params.projectId,
      projectName: params.projectName,
      files: fileMeta,
      gitCommitSha: params.gitCommitSha
    });

    // Embed manifest into the root of the ZIP
    const manifestJson = JSON.stringify(manifest, null, 2);
    zip.addFile('deck-sync-manifest.json', Buffer.from(manifestJson, 'utf8'));

    const zipBuffer = zip.toBuffer();
    const archiveSha256 = sha256(zipBuffer);

    return {
      zipBuffer,
      archiveSha256,
      manifest,
      fileCount: relPaths.length,
      totalSizeBytes: manifest.totalSizeBytes
    };
  }
}
