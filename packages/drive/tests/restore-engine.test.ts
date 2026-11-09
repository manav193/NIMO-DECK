import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SnapshotBuilder, RestoreEngine } from '../src/index.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('@nimo-deck/drive: RestoreEngine', () => {
  let sourceDir: string;
  let restoreDir: string;

  beforeEach(() => {
    sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-restore-src-'));
    restoreDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-restore-dst-'));

    fs.mkdirSync(path.join(sourceDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'README.md'), '# Original Content');
    fs.writeFileSync(path.join(sourceDir, 'src', 'app.ts'), 'export const active = true;');
  });

  afterEach(() => {
    fs.rmSync(sourceDir, { recursive: true, force: true });
    fs.rmSync(restoreDir, { recursive: true, force: true });
  });

  it('should restore project files faithfully when confirmation and SHA-256 match', () => {
    const build = SnapshotBuilder.buildSnapshot({
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      projectName: 'RestoreApp',
      projectPath: sourceDir
    });

    const result = RestoreEngine.restoreSnapshot(build.zipBuffer, {
      targetDirectory: restoreDir,
      expectedArchiveSha256: build.archiveSha256,
      confirmRestore: true
    });

    expect(result.success).toBe(true);
    expect(result.restoredFilesCount).toBe(2);

    // Verify restored file contents match originals exactly
    const restoredReadme = fs.readFileSync(path.join(restoreDir, 'README.md'), 'utf8');
    const restoredApp = fs.readFileSync(path.join(restoreDir, 'src', 'app.ts'), 'utf8');

    expect(restoredReadme).toBe('# Original Content');
    expect(restoredApp).toBe('export const active = true;');
  });

  it('should reject restore if confirmRestore is false', () => {
    const build = SnapshotBuilder.buildSnapshot({
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      projectName: 'RestoreApp',
      projectPath: sourceDir
    });

    expect(() =>
      RestoreEngine.restoreSnapshot(build.zipBuffer, {
        targetDirectory: restoreDir,
        confirmRestore: false // Not confirmed
      })
    ).toThrow(/confirmRestore must be explicitly true/);
  });

  it('should reject restore if archive SHA-256 checksum does not match', () => {
    const build = SnapshotBuilder.buildSnapshot({
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      projectName: 'RestoreApp',
      projectPath: sourceDir
    });

    expect(() =>
      RestoreEngine.restoreSnapshot(build.zipBuffer, {
        targetDirectory: restoreDir,
        expectedArchiveSha256: '0000000000000000000000000000000000000000000000000000000000000000', // Tampered hash
        confirmRestore: true
      })
    ).toThrow(/Restore Integrity Error/);
  });
});
