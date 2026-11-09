import fs from 'node:fs';
import path from 'node:path';
import {
  isImmutableIgnored,
  isProbableSecret,
  SECRET_SIGNATURE_PATTERNS
} from '@nimo-deck/shared';
import type { ScanResult, QuarantinedFile } from './types.js';

export interface ScannerOptions {
  maxFileSizeMb?: number; // Default 50MB
  entropyThreshold?: number; // Default 4.5
}

export class PreCommitScanner {
  private maxFileSizeBytes: number;

  constructor(options: ScannerOptions = {}) {
    this.maxFileSizeBytes = (options.maxFileSizeMb ?? 50) * 1024 * 1024;
  }

  /**
   * Scans a list of relative file paths against ignore patterns, size limits, and secret signatures.
   */
  async scan(repoPath: string, relativePaths: string[]): Promise<ScanResult> {
    const safeFiles: string[] = [];
    const quarantinedFiles: QuarantinedFile[] = [];

    for (const relPath of relativePaths) {
      // 1. Immutable Ignore Pattern Check
      if (isImmutableIgnored(relPath)) {
        quarantinedFiles.push({
          path: relPath,
          reason: 'IMMUTABLE_IGNORE',
          details: 'Matches immutable security or build exclusion pattern.'
        });
        continue;
      }

      const fullPath = path.resolve(repoPath, relPath);

      // Verify file boundary (sandboxing check)
      if (!fullPath.startsWith(path.resolve(repoPath))) {
        quarantinedFiles.push({
          path: relPath,
          reason: 'IMMUTABLE_IGNORE',
          details: 'Path traversal outside project root is blocked.'
        });
        continue;
      }

      if (!fs.existsSync(fullPath)) {
        // If file was deleted, it is safe to stage for deletion
        safeFiles.push(relPath);
        continue;
      }

      let stat: fs.Stats;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        continue;
      }

      // 2. File size ceiling check
      if (stat.size > this.maxFileSizeBytes) {
        quarantinedFiles.push({
          path: relPath,
          reason: 'FILE_TOO_LARGE',
          details: `File size (${(stat.size / 1024 / 1024).toFixed(1)}MB) exceeds safety threshold.`
        });
        continue;
      }

      // 3. Content Inspection for secrets (only inspect text files under 2MB)
      if (stat.size <= 2 * 1024 * 1024) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');

          // Check secret signatures
          const hasSignature = SECRET_SIGNATURE_PATTERNS.some((pattern) => pattern.test(content));
          if (hasSignature) {
            quarantinedFiles.push({
              path: relPath,
              reason: 'SECRET_SIGNATURE',
              details: 'Contains high-confidence credential or private key signature.'
            });
            continue;
          }

          // Check high entropy
          if (isProbableSecret(content)) {
            quarantinedFiles.push({
              path: relPath,
              reason: 'HIGH_ENTROPY_SECRET',
              details: 'Contains probable high-entropy token or secret key.'
            });
            continue;
          }
        } catch {
          // If reading as utf8 fails (binary file), allow if size is within limits
        }
      }

      safeFiles.push(relPath);
    }

    return {
      isSafe: quarantinedFiles.length === 0,
      safeFiles,
      quarantinedFiles
    };
  }
}
