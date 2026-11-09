import crypto from 'node:crypto';
import type { AuditLogRepository } from '@nimo-deck/core';
import type { AuditActor, AuditLogEntry } from '@nimo-deck/shared';
import { GENESIS_HASH, HashChainManager } from './hash-chain-manager.js';

export class AuditRecorder {
  constructor(private auditRepo: AuditLogRepository) {}

  record(params: {
    projectId?: string | null;
    actor: AuditActor;
    action: string;
    payload: unknown;
  }): AuditLogEntry {
    return this.auditRepo.appendLog(params);
  }

  recordCustomEntry(params: {
    projectId?: string | null;
    actor: AuditActor;
    action: string;
    payload: unknown;
  }): AuditLogEntry {
    const latest = this.auditRepo.getLatestEntry();
    const prevLogHash = latest ? latest.entryHash : GENESIS_HASH;
    const sequenceNum = (latest?.sequenceNum ?? 0) + 1;

    const id = crypto.randomUUID();
    const now = new Date();
    const payloadHash = HashChainManager.computePayloadHash(params.payload);

    const entryHash = HashChainManager.computeEntryHash({
      prevLogHash,
      sequenceNum,
      id,
      actor: params.actor,
      action: params.action,
      payloadHash,
      createdAt: now.getTime()
    });

    const entry: AuditLogEntry = {
      id,
      sequenceNum,
      projectId: params.projectId || null,
      actor: params.actor,
      action: params.action,
      payloadHash,
      prevLogHash,
      entryHash,
      createdAt: now
    };

    return this.auditRepo.appendLog({
      projectId: entry.projectId,
      actor: entry.actor,
      action: entry.action,
      payload: params.payload
    });
  }
}
