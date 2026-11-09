import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SafeRestoreEngine } from '../src/restore/safe-restore-engine.js';
import { SnapshotEngine } from '../src/snapshot/snapshot-engine.js';
import { BlobStore } from '../src/cas/blob-store.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('@nimo-deck/vault: SafeRestoreEngine', () => {
  let projectDir: string;
  let vaultDir: string;
  let blobStore: BlobStore;
  let snapshotEngine: SnapshotEngine;
  let restoreEngine: SafeRestoreEngine;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nimo-deck-restore-proj-'));
    vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nimo-deck-restore-vault-'));

    blobStore = new BlobStore(vaultDir, true);
    snapshotEngine = new SnapshotEngine(blobStore);
    restoreEngine = new SafeRestoreEngine(blobStore, snapshotEngine);
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
    fs.rmSync(vaultDir, { recursive: true, force: true });
  });

  it('should generate accurate preview of restore changes', async () => {
    // Initial file state
    fs.writeFileSync(path.join(projectDir, 'app.ts'), 'console.log("v1");\n');
    const snap = await snapshotEngine.createSnapshot({
      projectId: 'proj-1',
      projectPath: projectDir,
      description: 'v1 snapshot'
    });

    // Modify file and add new file
    fs.writeFileSync(path.join(projectDir, 'app.ts'), 'console.log("v2 modified");\n');
    fs.writeFileSync(path.join(projectDir, 'untracked.ts'), 'console.log("new");\n');

    const preview = restoreEngine.generatePreview(snap.manifest, projectDir);

    expect(preview.filesToOverwrite).toEqual(['app.ts']);
    expect(preview.filesToDelete).toEqual(['untracked.ts']);
    expect(preview.isWorkingTreeDirty).toBe(true);
    expect(preview.requiresConfirmation).toBe(true);
  });

  it('should refuse restore without explicit user confirmation', async () => {
    fs.writeFileSync(path.join(projectDir, 'app.ts'), 'v1\n');
    const snap = await snapshotEngine.createSnapshot({
      projectId: 'proj-1',
      projectPath: projectDir,
      description: 'v1 snapshot'
    });

    await expect(
      restoreEngine.executeRestore({
        snapshot: snap.snapshot,
        manifest: snap.manifest,
        projectPath: projectDir,
        confirmRestore: false
      })
    ).rejects.toThrow(/explicit user confirmation/);
  });

  it('should refuse restore when working tree is dirty unless allowOverwriteUncommitted is true', async () => {
    fs.writeFileSync(path.join(projectDir, 'app.ts'), 'v1\n');
    const snap = await snapshotEngine.createSnapshot({
      projectId: 'proj-1',
      projectPath: projectDir,
      description: 'v1 snapshot'
    });

    fs.writeFileSync(path.join(projectDir, 'app.ts'), 'v2 dirty uncommitted changes\n');

    await expect(
      restoreEngine.executeRestore({
        snapshot: snap.snapshot,
        manifest: snap.manifest,
        projectPath: projectDir,
        confirmRestore: true,
        allowOverwriteUncommitted: false
      })
    ).rejects.toThrow(/modified files that would be overwritten/);
  });

  it('should safely restore files when confirmed with pre-restore safety snapshot', async () => {
    fs.writeFileSync(path.join(projectDir, 'file.txt'), 'Original V1 Content\n');
    const snap = await snapshotEngine.createSnapshot({
      projectId: 'proj-1',
      projectPath: projectDir,
      description: 'V1 Checkpoint'
    });

    // Overwrite with V2
    fs.writeFileSync(path.join(projectDir, 'file.txt'), 'Damaged V2 Content\n');

    const restoreRes = await restoreEngine.executeRestore({
      snapshot: snap.snapshot,
      manifest: snap.manifest,
      projectPath: projectDir,
      confirmRestore: true,
      allowOverwriteUncommitted: true
    });

    expect(restoreRes.success).toBe(true);
    expect(restoreRes.restoredFileCount).toBe(1);
    expect(restoreRes.safetySnapshotId).toBeDefined();

    // Verify file content is restored to V1
    const restored = fs.readFileSync(path.join(projectDir, 'file.txt'), 'utf-8');
    expect(restored).toBe('Original V1 Content\n');
  });

  it('should support selective file restoration', async () => {
    fs.writeFileSync(path.join(projectDir, 'fileA.txt'), 'V1 A\n');
    fs.writeFileSync(path.join(projectDir, 'fileB.txt'), 'V1 B\n');
    const snap = await snapshotEngine.createSnapshot({
      projectId: 'proj-1',
      projectPath: projectDir,
      description: 'V1 Checkpoint'
    });

    // Mutate both files
    fs.writeFileSync(path.join(projectDir, 'fileA.txt'), 'V2 A\n');
    fs.writeFileSync(path.join(projectDir, 'fileB.txt'), 'V2 B\n');

    // Selectively restore only fileA.txt
    const restoreRes = await restoreEngine.executeRestore({
      snapshot: snap.snapshot,
      manifest: snap.manifest,
      projectPath: projectDir,
      confirmRestore: true,
      allowOverwriteUncommitted: true,
      selectiveFiles: ['fileA.txt']
    });

    expect(restoreRes.success).toBe(true);
    expect(restoreRes.restoredFileCount).toBe(1);

    expect(fs.readFileSync(path.join(projectDir, 'fileA.txt'), 'utf-8')).toBe('V1 A\n');
    expect(fs.readFileSync(path.join(projectDir, 'fileB.txt'), 'utf-8')).toBe('V2 B\n');
  });
});
