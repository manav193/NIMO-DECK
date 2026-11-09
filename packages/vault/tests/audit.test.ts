import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabaseConnection, runMigrations, AuditLogRepository } from '@nimo-deck/core';
import { AuditRecorder } from '../src/audit/audit-recorder.js';
import { AuditVerifier } from '../src/audit/audit-verifier.js';
import { AuditQueryService } from '../src/audit/audit-query-service.js';
import { GENESIS_HASH } from '../src/audit/hash-chain-manager.js';
import type Database from 'better-sqlite3';

describe('@nimo-deck/vault: Cryptographic Audit Engine', () => {
  let sqlite: Database.Database;
  let auditRepo: AuditLogRepository;
  let recorder: AuditRecorder;
  let queryService: AuditQueryService;

  beforeEach(() => {
    const conn = createDatabaseConnection({ inMemory: true });
    sqlite = conn.sqlite;
    runMigrations(sqlite);
    auditRepo = new AuditLogRepository(conn.db);
    recorder = new AuditRecorder(auditRepo);
    queryService = new AuditQueryService(auditRepo);
  });

  afterEach(() => {
    sqlite.close();
  });

  it('should assign sequential sequence numbers and link to genesis hash', () => {
    const log1 = recorder.record({
      actor: 'SYSTEM',
      action: 'SYSTEM_BOOT',
      payload: { mode: 'daemon' }
    });

    const log2 = recorder.record({
      actor: 'USER',
      action: 'CREATE_PROJECT',
      payload: { name: 'Apollo' }
    });

    expect(log1.sequenceNum).toBe(1);
    expect(log1.prevLogHash).toBe(GENESIS_HASH);

    expect(log2.sequenceNum).toBe(2);
    expect(log2.prevLogHash).toBe(log1.entryHash);

    const report = queryService.verifyChain();
    expect(report.isValid).toBe(true);
    expect(report.totalVerified).toBe(2);
  });

  it('should detect when an audit log payload has been tampered with', () => {
    recorder.record({ actor: 'SYSTEM', action: 'GIT_COMMIT', payload: { sha: '1111' } });
    const victim = recorder.record({ actor: 'USER', action: 'FORCE_PUSH', payload: { dangerous: true } });
    recorder.record({ actor: 'SYSTEM', action: 'GIT_COMMIT', payload: { sha: '3333' } });

    // Directly tamper with victim row in database
    sqlite.prepare("UPDATE audit_logs SET payload_hash = 'tampered_hash_value' WHERE id = ?").run(victim.id);

    const report = queryService.verifyChain();
    expect(report.isValid).toBe(false);
    expect(report.tamperedEntryId).toBe(victim.id);
    expect(report.reason).toContain('tampered');
  });

  it('should detect when an audit entry is deleted from the middle of the chain', () => {
    recorder.record({ actor: 'SYSTEM', action: 'EVENT_A', payload: {} });
    const victim = recorder.record({ actor: 'USER', action: 'EVENT_B', payload: {} });
    recorder.record({ actor: 'SYSTEM', action: 'EVENT_C', payload: {} });

    // Delete the middle entry
    sqlite.prepare('DELETE FROM audit_logs WHERE id = ?').run(victim.id);

    const report = queryService.verifyChain();
    expect(report.isValid).toBe(false);
    expect(report.reason).toMatch(/Previous hash pointer mismatch|Sequence break/);
  });

  it('should support rich filtering by actor, action, and project', () => {
    const projA = '11111111-1111-1111-1111-111111111111';
    const projB = '22222222-2222-2222-2222-222222222222';

    // Insert projects to satisfy foreign key constraints
    const now = Date.now();
    sqlite.prepare("INSERT INTO projects (id, name, local_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(projA, 'Project A', '/tmp/a', now, now);
    sqlite.prepare("INSERT INTO projects (id, name, local_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(projB, 'Project B', '/tmp/b', now, now);

    recorder.record({ projectId: projA, actor: 'SYSTEM', action: 'GIT_COMMIT', payload: {} });
    recorder.record({ projectId: projA, actor: 'USER', action: 'VAULT_SNAPSHOT', payload: {} });
    recorder.record({ projectId: projB, actor: 'AI_AGENT', action: 'AI_ANALYSIS', payload: {} });

    const projAEntries = queryService.query({ projectId: projA });
    expect(projAEntries.length).toBe(2);

    const aiEntries = queryService.query({ actor: 'AI_AGENT' });
    expect(aiEntries.length).toBe(1);
    expect(aiEntries[0].action).toBe('AI_ANALYSIS');

    const commitEntries = queryService.query({ action: 'COMMIT' });
    expect(commitEntries.length).toBe(1);
  });

  it('should provide transparent security model documentation', () => {
    const notice = queryService.getSecurityModelNotice();
    expect(notice.model).toContain('Tamper-Evident');
    expect(notice.guarantee).toContain('Cryptographic');
    expect(notice.limitations).toContain('direct disk');
  });
});
