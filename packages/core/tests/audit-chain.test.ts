import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createDatabaseConnection,
  AuditLogRepository,
  GENESIS_HASH
} from '../src/index.js';
import type Database from 'better-sqlite3';

describe('@nimo-deck/core: AuditLog Hash Chaining & Tamper Detection', () => {
  let sqlite: Database.Database;
  let auditRepo: AuditLogRepository;

  beforeEach(() => {
    const conn = createDatabaseConnection({ inMemory: true });
    sqlite = conn.sqlite;
    auditRepo = new AuditLogRepository(conn.db);
  });

  afterEach(() => {
    sqlite.close();
  });

  it('should link the first log entry to the GENESIS_HASH', () => {
    const entry = auditRepo.appendLog({
      actor: 'SYSTEM',
      action: 'SYSTEM_BOOT',
      payload: { version: '0.1.0' }
    });

    expect(entry.prevLogHash).toBe(GENESIS_HASH);
    expect(entry.entryHash).toHaveLength(64);
  });

  it('should cryptographically link successive entries into a verified hash chain', () => {
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

    expect(entry1.prevLogHash).toBe(GENESIS_HASH);
    expect(entry2.prevLogHash).toBe(entry1.entryHash);
    expect(entry3.prevLogHash).toBe(entry2.entryHash);

    const verification = auditRepo.verifyChainIntegrity();
    expect(verification.isValid).toBe(true);
    expect(verification.totalVerified).toBe(3);
  });

  it('should immediately detect tampering if an audit record payload is modified', () => {
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
    expect(auditRepo.verifyChainIntegrity().isValid).toBe(true);

    // Tamper directly with the SQLite row for entry2 (modify action from STEP_2 to MALICIOUS_ACTION)
    sqlite
      .prepare('UPDATE audit_logs SET action = ? WHERE id = ?')
      .run('MALICIOUS_ACTION', entry2.id);

    // Re-verify chain: must detect tampering
    const verification = auditRepo.verifyChainIntegrity();
    expect(verification.isValid).toBe(false);
    expect(verification.tamperedEntryId).toBe(entry2.id);
    expect(verification.tamperedIndex).toBe(1);
    expect(verification.reason).toContain('Entry hash corrupted');
  });

  it('should detect tampering if a record is deleted from the middle of the chain', () => {
    auditRepo.appendLog({ actor: 'SYSTEM', action: 'A', payload: {} });
    const entryB = auditRepo.appendLog({ actor: 'SYSTEM', action: 'B', payload: {} });
    const entryC = auditRepo.appendLog({ actor: 'SYSTEM', action: 'C', payload: {} });

    expect(auditRepo.verifyChainIntegrity().isValid).toBe(true);

    // Delete record B
    sqlite.prepare('DELETE FROM audit_logs WHERE id = ?').run(entryB.id);

    // Entry C's prevLogHash still points to B, but B is missing; row 1 is now C whose prevHash does not match A's entryHash
    const verification = auditRepo.verifyChainIntegrity();
    expect(verification.isValid).toBe(false);
    expect(verification.tamperedEntryId).toBe(entryC.id);
    expect(verification.reason).toContain('Previous hash mismatch');
  });
});
