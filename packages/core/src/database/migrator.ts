import type Database from 'better-sqlite3';

export const MIGRATION_SQL = `
-- 1. Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  local_path TEXT NOT NULL UNIQUE,
  git_remote_url TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'PAUSED', 'ERROR')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_local_path ON projects(local_path);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- 2. Sync Configs
CREATE TABLE IF NOT EXISTS sync_configs (
  project_id TEXT PRIMARY KEY,
  auto_commit_enabled INTEGER NOT NULL DEFAULT 1,
  debounce_window_ms INTEGER NOT NULL DEFAULT 5000,
  max_wait_ms INTEGER NOT NULL DEFAULT 30000,
  auto_push_mode TEXT NOT NULL DEFAULT 'ON_COMMIT' CHECK(auto_push_mode IN ('OFF', 'ON_COMMIT', 'SCHEDULED')),
  push_interval_sec INTEGER NOT NULL DEFAULT 300,
  ai_commit_messages INTEGER NOT NULL DEFAULT 0,
  dry_run_mode INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 3. Sync Events
CREATE TABLE IF NOT EXISTS sync_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'PENDING', 'FAILED')),
  details_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sync_events_project_created ON sync_events(project_id, created_at DESC);

-- 4. Commit History
CREATE TABLE IF NOT EXISTS commit_history (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  branch TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  message TEXT NOT NULL,
  files_changed_count INTEGER NOT NULL,
  is_auto_generated INTEGER NOT NULL,
  committed_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_commit_history_project_committed ON commit_history(project_id, committed_at DESC);
CREATE INDEX IF NOT EXISTS idx_commit_history_sha ON commit_history(commit_sha);

-- 5. Remote Sync States
CREATE TABLE IF NOT EXISTS remote_sync_states (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  local_head_sha TEXT NOT NULL,
  remote_head_sha TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK(sync_status IN ('IN_SYNC', 'AHEAD', 'BEHIND', 'DIVERGED')),
  last_synced_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_remote_sync_states_project_branch ON remote_sync_states(project_id, branch_name);

-- 6. Google Drive Backups
CREATE TABLE IF NOT EXISTS drive_backups (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  drive_file_id TEXT NOT NULL,
  drive_folder_id TEXT NOT NULL,
  snapshot_sha256 TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  backup_type TEXT NOT NULL CHECK(backup_type IN ('SNAPSHOT', 'DOCS_MIRROR')),
  status TEXT NOT NULL CHECK(status IN ('PENDING', 'COMPLETED', 'FAILED')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_drive_backups_project_created ON drive_backups(project_id, created_at DESC);

-- 7. AI Analyses
CREATE TABLE IF NOT EXISTS ai_analyses (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  model_used TEXT NOT NULL,
  summary_markdown TEXT NOT NULL,
  tech_debt_report TEXT NOT NULL,
  security_report TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_project_created ON ai_analyses(project_id, created_at DESC);

-- 8. AI Recommendations
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('VERIFIED_FACT', 'AI_HYPOTHESIS')),
  severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  complexity TEXT NOT NULL CHECK(complexity IN ('XS', 'S', 'M', 'L', 'XL')),
  reasoning TEXT NOT NULL,
  expected_benefits TEXT NOT NULL,
  dependencies_json TEXT NOT NULL,
  implementation_steps_json TEXT NOT NULL,
  suggested_diff_snippet TEXT,
  status TEXT NOT NULL DEFAULT 'PROPOSED' CHECK(status IN ('PROPOSED', 'ACCEPTED', 'REJECTED', 'RESOLVED')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (analysis_id) REFERENCES ai_analyses(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_project_status ON ai_recommendations(project_id, status);

-- 9. AI Roadmaps
CREATE TABLE IF NOT EXISTS ai_roadmaps (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  roadmap_json TEXT NOT NULL,
  generated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 10. Audit Logs (Tamper-Evident Hash Chain)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  actor TEXT NOT NULL CHECK(actor IN ('SYSTEM', 'USER', 'AI_AGENT')),
  action TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  prev_log_hash TEXT NOT NULL,
  entry_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at ASC);

-- 11. Vault Snapshots
CREATE TABLE IF NOT EXISTS vault_snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  commit_sha TEXT,
  patch_data TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
`;

/**
 * Runs database migrations idempotently against a BetterSQLite3 instance.
 */
export function runMigrations(sqlite: Database.Database): void {
  sqlite.exec(MIGRATION_SQL);
}
