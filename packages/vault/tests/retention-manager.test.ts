import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabaseConnection, runMigrations, VaultRepository } from '@nimo-deck/core';
import { VaultRetentionManager } from '../src/retention/retention-manager.js';
import type Database from 'better-sqlite3';

describe('@nimo-deck/vault: VaultRetentionManager', () => {
  let sqlite: Database.Database;
  let vaultRepo: VaultRepository;
  let retentionManager: VaultRetentionManager;
  const projectId = '44444444-4444-4444-4444-444444444444';

  beforeEach(() => {
    const conn = createDatabaseConnection({ inMemory: true });
    sqlite = conn.sqlite;
    runMigrations(sqlite);
    vaultRepo = new VaultRepository(conn.db);
    retentionManager = new VaultRetentionManager(vaultRepo);

    const now = Date.now();
    sqlite.prepare('INSERT INTO projects (id, name, local_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
      projectId,
      'Voyager App',
      '/code/voyager',
      now,
      now
    );
  });

  afterEach(() => {
    sqlite.close();
  });

  it('should preserve the newest recovery point and pinned snapshots while pruning excess', () => {
    const now = Date.now();

    // 1. Oldest snapshot (unpinned)
    const oldSnap = vaultRepo.saveSnapshot({
      projectId,
      description: 'Ancient snapshot 1',
      patchData: '',
      snapshotType: 'FULL'
    });
    sqlite.prepare('UPDATE vault_snapshots SET created_at = ? WHERE id = ?').run(now - 100 * 24 * 60 * 60 * 1000, oldSnap.id);

    // 2. Middle snapshot (pinned!)
    const pinnedSnap = vaultRepo.saveSnapshot({
      projectId,
      description: 'Pinned v1.0.0 Golden Release',
      patchData: '',
      snapshotType: 'FULL',
      isPinned: true
    });
    sqlite.prepare('UPDATE vault_snapshots SET created_at = ? WHERE id = ?').run(now - 50 * 24 * 60 * 60 * 1000, pinnedSnap.id);

    // 3. Newest snapshot (recovery point)
    const newestSnap = vaultRepo.saveSnapshot({
      projectId,
      description: 'Most recent checkpoint',
      patchData: '',
      snapshotType: 'FULL',
      isPinned: false
    });
    sqlite.prepare('UPDATE vault_snapshots SET created_at = ? WHERE id = ?').run(now - 1000, newestSnap.id);

    // Apply strict retention: max 1 snapshot or older than 30 days
    const result = retentionManager.applyRetention(projectId, {
      maxSnapshotsPerProject: 1,
      maxAgeDays: 30
    });

    expect(result.snapshotsPruned).toBe(1); // Only oldSnap should be pruned
    expect(result.snapshotsRetained).toBe(2); // newestSnap and pinnedSnap must be preserved

    const remaining = vaultRepo.listSnapshots(projectId);
    const remainingIds = remaining.map((s) => s.id);

    expect(remainingIds).toContain(newestSnap.id);
    expect(remainingIds).toContain(pinnedSnap.id);
    expect(remainingIds).not.toContain(oldSnap.id);
  });
});
