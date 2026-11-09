import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SnapshotBuilder } from '../src/index.js';
import AdmZip from 'adm-zip';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('@nimo-deck/drive: SnapshotBuilder', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-snap-build-'));

    // Create realistic repository structure
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'node_modules', 'pkg'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.git', 'objects'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'dist'), { recursive: true });

    // Safe files
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Project');
    fs.writeFileSync(path.join(tempDir, 'src', 'index.ts'), 'export const val = 42;');

    // Ignored / Sensitive files that MUST be excluded
    fs.writeFileSync(path.join(tempDir, '.env'), 'SECRET=123');
    fs.writeFileSync(path.join(tempDir, 'node_modules', 'pkg', 'index.js'), 'module.exports = {};');
    fs.writeFileSync(path.join(tempDir, '.git', 'HEAD'), 'ref: refs/heads/main');
    fs.writeFileSync(path.join(tempDir, 'dist', 'bundle.js'), 'console.log();');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should build a sanitized ZIP archive containing only safe files and manifest', () => {
    const build = SnapshotBuilder.buildSnapshot({
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      projectName: 'TestProject',
      projectPath: tempDir
    });

    expect(build.zipBuffer).toBeInstanceOf(Buffer);
    expect(build.archiveSha256).toHaveLength(64);
    expect(build.fileCount).toBe(2); // README.md and src/index.ts

    // Unpack ZIP in memory and inspect entry names
    const zip = new AdmZip(build.zipBuffer);
    const entryNames = zip.getEntries().map((e) => e.entryName);

    expect(entryNames).toContain('README.md');
    expect(entryNames).toContain('src/index.ts');
    expect(entryNames).toContain('deck-sync-manifest.json');

    // Invariant checks: ignored files must NOT exist in archive
    expect(entryNames).not.toContain('.env');
    expect(entryNames.some((n) => n.includes('node_modules'))).toBe(false);
    expect(entryNames.some((n) => n.includes('.git'))).toBe(false);
    expect(entryNames.some((n) => n.includes('dist/'))).toBe(false);

    // Verify manifest contents
    const manifestEntry = zip.getEntry('deck-sync-manifest.json');
    expect(manifestEntry).not.toBeNull();
    const manifest = JSON.parse(manifestEntry!.getData().toString('utf8'));
    expect(manifest.projectName).toBe('TestProject');
    expect(manifest.syncToken).toBeDefined();
    expect(manifest.manifestSha256).toHaveLength(64);
  });
});
