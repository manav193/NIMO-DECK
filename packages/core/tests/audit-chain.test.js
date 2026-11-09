"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
(0, vitest_1.describe)('@nimo-deck/core: AuditLog Hash Chaining & Tamper Detection', () => {
    let sqlite;
    let auditRepo;
    (0, vitest_1.beforeEach)(() => {
        const conn = (0, index_js_1.createDatabaseConnection)({ inMemory: true });
        sqlite = conn.sqlite;
        auditRepo = new index_js_1.AuditLogRepository(conn.db);
    });
    (0, vitest_1.afterEach)(() => {
        sqlite.close();
    });
    (0, vitest_1.it)('should link the first log entry to the GENESIS_HASH', () => {
        const entry = auditRepo.appendLog({
            actor: 'SYSTEM',
            action: 'SYSTEM_BOOT',
            payload: { version: '0.1.0' }
        });
        (0, vitest_1.expect)(entry.prevLogHash).toBe(index_js_1.GENESIS_HASH);
        (0, vitest_1.expect)(entry.entryHash).toHaveLength(64);
    });
    (0, vitest_1.it)('should cryptographically link successive entries into a verified hash chain', () => {
        const entry1 = auditRepo.appendLog({
            actor: 'USER',
            action: 'ADD_PROJECT',
            payload: { name: 'Repo1' }
        });
        const entry2 = auditRepo.appendLog({
            actor: 'SYSTEM',
            action: 'GIT_COMMIT',
            payload: { sha: 'abcdef' }
        });
        const entry3 = auditRepo.appendLog({
            actor: 'SYSTEM',
            action: 'DRIVE_SNAPSHOT',
            payload: { size: 1024 }
        });
        (0, vitest_1.expect)(entry1.prevLogHash).toBe(index_js_1.GENESIS_HASH);
        (0, vitest_1.expect)(entry2.prevLogHash).toBe(entry1.entryHash);
        (0, vitest_1.expect)(entry3.prevLogHash).toBe(entry2.entryHash);
        const verification = auditRepo.verifyChainIntegrity();
        (0, vitest_1.expect)(verification.isValid).toBe(true);
        (0, vitest_1.expect)(verification.totalVerified).toBe(3);
    });
    (0, vitest_1.it)('should immediately detect tampering if an audit record payload is modified', () => {
        auditRepo.appendLog({
            actor: 'SYSTEM',
            action: 'STEP_1',
            payload: { value: 1 }
        });
        const entry2 = auditRepo.appendLog({
            actor: 'USER',
            action: 'STEP_2',
            payload: { value: 2 }
        });
        auditRepo.appendLog({
            actor: 'SYSTEM',
            action: 'STEP_3',
            payload: { value: 3 }
        });
        // Verify intact chain first
        (0, vitest_1.expect)(auditRepo.verifyChainIntegrity().isValid).toBe(true);
        // Tamper directly with the SQLite row for entry2 (modify action from STEP_2 to MALICIOUS_ACTION)
        sqlite
            .prepare('UPDATE audit_logs SET action = ? WHERE id = ?')
            .run('MALICIOUS_ACTION', entry2.id);
        // Re-verify chain: must detect tampering
        const verification = auditRepo.verifyChainIntegrity();
        (0, vitest_1.expect)(verification.isValid).toBe(false);
        (0, vitest_1.expect)(verification.tamperedEntryId).toBe(entry2.id);
        (0, vitest_1.expect)(verification.tamperedIndex).toBe(1);
        (0, vitest_1.expect)(verification.reason).toContain('Entry hash corrupted');
    });
    (0, vitest_1.it)('should detect tampering if a record is deleted from the middle of the chain', () => {
        auditRepo.appendLog({ actor: 'SYSTEM', action: 'A', payload: {} });
        const entryB = auditRepo.appendLog({ actor: 'SYSTEM', action: 'B', payload: {} });
        const entryC = auditRepo.appendLog({ actor: 'SYSTEM', action: 'C', payload: {} });
        (0, vitest_1.expect)(auditRepo.verifyChainIntegrity().isValid).toBe(true);
        // Delete record B
        sqlite.prepare('DELETE FROM audit_logs WHERE id = ?').run(entryB.id);
        // Entry C's prevLogHash still points to B, but B is missing; row 1 is now C whose prevHash does not match A's entryHash
        const verification = auditRepo.verifyChainIntegrity();
        (0, vitest_1.expect)(verification.isValid).toBe(false);
        (0, vitest_1.expect)(verification.tamperedEntryId).toBe(entryC.id);
        (0, vitest_1.expect)(verification.reason).toContain('Previous hash mismatch');
    });
});
//# sourceMappingURL=audit-chain.test.js.map