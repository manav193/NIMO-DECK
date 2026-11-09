import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabaseConnection } from '../src/index.js';
import type Database from 'better-sqlite3';

describe('@nimo-deck/core: Database Connection & Migrations', () => {
  let sqlite: Database.Database;

  beforeEach(() => {
    const conn = createDatabaseConnection({ inMemory: true });
    sqlite = conn.sqlite;
  });

  afterEach(() => {
    sqlite.close();
  });

  it('should initialize SQLite in-memory with foreign keys enabled', () => {
    const fkPragma = sqlite.pragma('foreign_keys', { simple: true });
    expect(fkPragma).toBe(1);
  });

  it('should create all required core tables during migration', () => {
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('projects');
    expect(tableNames).toContain('sync_configs');
    expect(tableNames).toContain('sync_events');
    expect(tableNames).toContain('commit_history');
    expect(tableNames).toContain('remote_sync_states');
    expect(tableNames).toContain('drive_backups');
    expect(tableNames).toContain('ai_analyses');
    expect(tableNames).toContain('ai_recommendations');
    expect(tableNames).toContain('ai_roadmaps');
    expect(tableNames).toContain('audit_logs');
    expect(tableNames).toContain('vault_snapshots');
  });
});
