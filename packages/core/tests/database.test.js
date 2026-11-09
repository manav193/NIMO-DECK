"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
(0, vitest_1.describe)('@nimo-deck/core: Database Connection & Migrations', () => {
    let sqlite;
    (0, vitest_1.beforeEach)(() => {
        const conn = (0, index_js_1.createDatabaseConnection)({ inMemory: true });
        sqlite = conn.sqlite;
    });
    (0, vitest_1.afterEach)(() => {
        sqlite.close();
    });
    (0, vitest_1.it)('should initialize SQLite in-memory with foreign keys enabled', () => {
        const fkPragma = sqlite.pragma('foreign_keys', { simple: true });
        (0, vitest_1.expect)(fkPragma).toBe(1);
    });
    (0, vitest_1.it)('should create all required core tables during migration', () => {
        const tables = sqlite
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
            .all();
        const tableNames = tables.map((t) => t.name);
        (0, vitest_1.expect)(tableNames).toContain('projects');
        (0, vitest_1.expect)(tableNames).toContain('sync_configs');
        (0, vitest_1.expect)(tableNames).toContain('sync_events');
        (0, vitest_1.expect)(tableNames).toContain('commit_history');
        (0, vitest_1.expect)(tableNames).toContain('remote_sync_states');
        (0, vitest_1.expect)(tableNames).toContain('drive_backups');
        (0, vitest_1.expect)(tableNames).toContain('ai_analyses');
        (0, vitest_1.expect)(tableNames).toContain('ai_recommendations');
        (0, vitest_1.expect)(tableNames).toContain('ai_roadmaps');
        (0, vitest_1.expect)(tableNames).toContain('audit_logs');
        (0, vitest_1.expect)(tableNames).toContain('vault_snapshots');
    });
});
//# sourceMappingURL=database.test.js.map