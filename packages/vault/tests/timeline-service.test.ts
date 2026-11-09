import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabaseConnection, runMigrations, commitHistory, syncEvents, driveBackups, vaultSnapshots, auditLogs } from '@nimo-deck/core';
import { ProjectTimelineService } from '../src/timeline/timeline-service.js';
import type Database from 'better-sqlite3';

describe('@nimo-deck/vault: ProjectTimelineService', () => {
  let sqlite: Database.Database;
  let timelineService: ProjectTimelineService;
  const projectId = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    const conn = createDatabaseConnection({ inMemory: true });
    sqlite = conn.sqlite;
    runMigrations(sqlite);
    timelineService = new ProjectTimelineService(conn.db);

    const now = Date.now();
    sqlite.prepare('INSERT INTO projects (id, name, local_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
      projectId,
      'Apollo Engine',
      '/code/apollo',
      now,
      now
    );
  });

  afterEach(() => {
    sqlite.close();
  });

  it('should aggregate Git commits, sync cycles, Drive backups, snapshots, and audit events', () => {
    const now = new Date();

    // 1. Commit
    sqlite.prepare(`
      INSERT INTO commit_history (id, project_id, commit_sha, branch, message, author_name, author_email, committed_at, files_changed_count, is_auto_generated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('c-1', projectId, 'sha111', 'main', 'feat: initial bootstrap', 'Alice', 'alice@nimo.io', now.getTime() - 5000, 3, 0);

    // 2. Sync Event
    sqlite.prepare(`
      INSERT INTO sync_events (id, project_id, event_type, status, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('s-1', projectId, 'FILE_CHANGED', 'SUCCESS', '{}', now.getTime() - 4000);

    // 3. Drive Backup
    sqlite.prepare(`
      INSERT INTO drive_backups (id, project_id, drive_file_id, drive_folder_id, snapshot_sha256, size_bytes, backup_type, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('d-1', projectId, 'file_111', 'folder_111', 'sha-snap', 1024, 'SNAPSHOT', 'COMPLETED', now.getTime() - 3000);

    // 4. Vault Snapshot
    sqlite.prepare(`
      INSERT INTO vault_snapshots (id, project_id, patch_data, description, snapshot_type, root_hash, file_count, size_bytes, is_pinned, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('snap-1', projectId, 'patch data diff', 'Milestone 1 Checkpoint', 'FULL', 'roothash123', 5, 2048, 1, now.getTime() - 2000);

    // 5. Audit Log
    sqlite.prepare(`
      INSERT INTO audit_logs (id, sequence_num, project_id, actor, action, payload_hash, prev_log_hash, entry_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('a-1', 1, projectId, 'USER', 'PROJECT_RESTORE_INITIATED', 'p-hash', 'prev-hash', 'e-hash', now.getTime() - 1000);

    const timeline = timelineService.getProjectTimeline({ projectId });

    expect(timeline.length).toBe(5);
    // Chronologically descending
    expect(timeline[0].type).toBe('VAULT_RESTORE');
    expect(timeline[1].type).toBe('VAULT_SNAPSHOT');
    expect(timeline[2].type).toBe('DRIVE_BACKUP');
    expect(timeline[3].type).toBe('SYNC_CYCLE');
    expect(timeline[4].type).toBe('GIT_COMMIT');
  });

  it('should filter events by type and search query', () => {
    const now = new Date();
    sqlite.prepare(`
      INSERT INTO commit_history (id, project_id, commit_sha, branch, message, author_name, author_email, committed_at, files_changed_count, is_auto_generated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('c-2', projectId, 'sha222', 'main', 'fix: critical bug in parser', 'Bob', 'bob@nimo.io', now.getTime() - 2000, 1, 0);

    sqlite.prepare(`
      INSERT INTO vault_snapshots (id, project_id, patch_data, description, snapshot_type, root_hash, file_count, size_bytes, is_pinned, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('snap-2', projectId, 'patch diff', 'Production release tag', 'FULL', 'roothash456', 8, 4096, 0, now.getTime() - 1000);

    const commitsOnly = timelineService.getProjectTimeline({
      projectId,
      types: ['GIT_COMMIT']
    });
    expect(commitsOnly.length).toBe(1);
    expect(commitsOnly[0].title).toContain('critical bug in parser');

    const searchResults = timelineService.getProjectTimeline({
      projectId,
      search: 'release'
    });
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].type).toBe('VAULT_SNAPSHOT');
  });
});
