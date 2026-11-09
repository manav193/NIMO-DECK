import { eq, desc, asc } from 'drizzle-orm';
import type { DeckDatabase } from '../database/connection.js';
import { auditLogs } from '../database/schema.js';
import type { AuditLogEntry, AuditActor } from '@nimo-deck/shared';
import { hashPayload, computeAuditChainHash } from '@nimo-deck/shared';
import crypto from 'node:crypto';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export interface ChainVerificationResult {
  isValid: boolean;
  totalVerified: number;
  tamperedEntryId?: string;
  tamperedIndex?: number;
  reason?: string;
}

export class AuditLogRepository {
  constructor(private db: DeckDatabase) {}

  getLatestEntry(): AuditLogEntry | null {
    const row = this.db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(1)
      .get();

    if (!row) return null;

    return {
      id: row.id,
      sequenceNum: row.sequenceNum ?? undefined,
      projectId: row.projectId,
      actor: row.actor,
      action: row.action,
      payloadHash: row.payloadHash,
      prevLogHash: row.prevLogHash,
      entryHash: row.entryHash,
      createdAt: row.createdAt
    };
  }

  appendLog(params: {
    projectId?: string | null;
    actor: AuditActor;
    action: string;
    payload: unknown;
  }): AuditLogEntry {
    const latest = this.getLatestEntry();
    const prevLogHash = latest ? latest.entryHash : GENESIS_HASH;
    const sequenceNum = (latest?.sequenceNum ?? 0) + 1;

    const id = crypto.randomUUID();
    const now = new Date();
    const payloadHash = hashPayload(params.payload);

    const entryHash = computeAuditChainHash({
      prevLogHash,
      id,
      actor: params.actor as 'SYSTEM' | 'USER' | 'AI_AGENT',
      action: params.action,
      payloadHash,
      createdAt: now.getTime()
    });

    const record: typeof auditLogs.$inferInsert = {
      id,
      sequenceNum,
      projectId: params.projectId || null,
      actor: params.actor as 'SYSTEM' | 'USER' | 'AI_AGENT',
      action: params.action,
      payloadHash,
      prevLogHash,
      entryHash,
      createdAt: now
    };

    this.db.insert(auditLogs).values(record).run();

    return {
      id,
      sequenceNum,
      projectId: params.projectId || null,
      actor: params.actor as 'SYSTEM' | 'USER' | 'AI_AGENT',
      action: params.action,
      payloadHash,
      prevLogHash,
      entryHash,
      createdAt: now
    };
  }

  listLogs(projectId?: string, limit = 100): AuditLogEntry[] {
    const query = projectId
      ? this.db.select().from(auditLogs).where(eq(auditLogs.projectId, projectId))
      : this.db.select().from(auditLogs);

    const rows = query.orderBy(desc(auditLogs.createdAt)).limit(limit).all();

    return rows.map((row) => ({
      id: row.id,
      sequenceNum: row.sequenceNum ?? undefined,
      projectId: row.projectId,
      actor: row.actor,
      action: row.action,
      payloadHash: row.payloadHash,
      prevLogHash: row.prevLogHash,
      entryHash: row.entryHash,
      createdAt: row.createdAt
    }));
  }

  /**
   * Verifies the cryptographic integrity of the entire audit chain from genesis to head.
   */
  verifyChainIntegrity(): ChainVerificationResult {
    const rows = this.db.select().from(auditLogs).orderBy(asc(auditLogs.createdAt)).all();

    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // 1. Verify link to previous entry
      if (row.prevLogHash !== expectedPrevHash) {
        return {
          isValid: false,
          totalVerified: i,
          tamperedEntryId: row.id,
          tamperedIndex: i,
          reason: `Previous hash mismatch: expected ${expectedPrevHash}, found ${row.prevLogHash}`
        };
      }

      // 2. Recompute entry hash
      const recomputedHash = computeAuditChainHash({
        prevLogHash: row.prevLogHash,
        id: row.id,
        actor: row.actor,
        action: row.action,
        payloadHash: row.payloadHash,
        createdAt: row.createdAt.getTime()
      });

      if (recomputedHash !== row.entryHash) {
        return {
          isValid: false,
          totalVerified: i,
          tamperedEntryId: row.id,
          tamperedIndex: i,
          reason: `Entry hash corrupted: recomputed ${recomputedHash}, stored ${row.entryHash}`
        };
      }

      expectedPrevHash = row.entryHash;
    }

    return {
      isValid: true,
      totalVerified: rows.length
    };
  }
}
