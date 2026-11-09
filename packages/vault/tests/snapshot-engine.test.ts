import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SnapshotEngine } from '../src/snapshot/snapshot-engine.js';
import { BlobStore } from '../src/cas/blob-store.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('@nimo-deck/vault: SnapshotEngine', () => {
  let projectDir: string;
  let vaultDir: string;
  let blobStore: BlobStore;
  let engine: SnapshotEngine;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nimo-deck-snap-proj-'));
    vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nimo-deck-snap-vault-'));

    // Create sample project structure
    fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'node_modules', 'dep'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, '.git'), { recursive: true });

    fs.writeFileSync(path.join(projectDir, 'src', 'index.ts'), 'export const app = "NIMO-DECK";\n');
    fs.writeFileSync(path.join(projectDir, 'README.md'), '# Sample Project\n');
    fs.writeFileSync(path.join(projectDir, '.env'), 'SECRET_KEY=supersecret1234\n');
    fs.writeFileSync(path.join(projectDir, 'node_modules', 'dep', 'index.js'), 'module.exports = {};\n');

    blobStore = new BlobStore(vaultDir, true);
    engine = new SnapshotEngine(blobStore);
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
    fs.rmSync(vaultDir, { recursive: true, force: true });
  });

  it('should capture a non-destructive snapshot excluding ignored directories and secrets', async () => {
    const originalContent = fs.readFileSync(path.join(projectDir, 'src', 'index.ts'), 'utf-8');

    const result = await engine.createSnapshot({
      projectId: 'proj-123',
      projectPath: projectDir,
      description: 'Initial checkpoint'
    });

    expect(result.snapshot.id).toBeDefined();
    expect(result.snapshot.fileCount).toBe(2); // Only src/index.ts and README.md
    expect(result.manifest.rootHash).toHaveLength(64);

    const filePaths = result.manifest.files.map((f) => f.path);
    expect(filePaths).toContain('src/index.ts');
    expect(filePaths).toContain('README.md');

    // Crucial safety guarantee: .env and node_modules must NEVER be in manifest
    expect(filePaths).not.toContain('.env');
    expect(filePaths).not.toContain('node_modules/dep/index.js');

    // Original working tree must remain untouched
    const currentContent = fs.readFileSync(path.join(projectDir, 'src', 'index.ts'), 'utf-8');
    expect(currentContent).toBe(originalContent);
  });

  it('should leverage CAS deduplication when unchanged files are snapshotted', async () => {
    const snap1 = await engine.createSnapshot({
      projectId: 'proj-123',
      projectPath: projectDir,
      description: 'First snapshot'
    });
    expect(snap1.newBlobsStored).toBe(2);
    expect(snap1.deduplicatedBlobs).toBe(0);

    // Second snapshot without file edits
    const snap2 = await engine.createSnapshot({
      projectId: 'proj-123',
      projectPath: projectDir,
      description: 'Second snapshot'
    });
    expect(snap2.newBlobsStored).toBe(0);
    expect(snap2.deduplicatedBlobs).toBe(2);
    expect(snap2.manifest.rootHash).toBe(snap1.manifest.rootHash);
  });
});
