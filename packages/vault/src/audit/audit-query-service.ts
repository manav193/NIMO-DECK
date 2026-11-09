import type { AuditLogRepository } from '@nimo-deck/core';
import type { AuditActor, AuditLogEntry } from '@nimo-deck/shared';
import { AuditVerifier, type AuditVerificationReport } from './audit-verifier.js';

export interface AuditQueryFilter {
  projectId?: string;
  actor?: AuditActor;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export class AuditQueryService {
  constructor(private auditRepo: AuditLogRepository) {}

  /**
   * Queries audit records applying optional project, actor, action, and date filters.
   */
  query(filter: AuditQueryFilter = {}): AuditLogEntry[] {
    const raw = this.auditRepo.listLogs(filter.projectId, filter.limit || 100);

    return raw.filter((e) => {
      if (filter.actor && e.actor !== filter.actor) return false;
      if (filter.action && !e.action.toLowerCase().includes(filter.action.toLowerCase())) return false;
      if (filter.startDate && e.createdAt < filter.startDate) return false;
      if (filter.endDate && e.createdAt > filter.endDate) return false;
      return true;
    });
  }

  /**
   * Runs verification on the audit chain for a specific project or the entire system.
   */
  verifyChain(projectId?: string): AuditVerificationReport {
    const entries = this.auditRepo.listLogs(projectId, 10000);
    return AuditVerifier.verifyChain(entries);
  }

  /**
   * Returns a technical description of the audit storage security model:
   * Explains that cryptographic hash chaining makes records tamper-evident
   * (any retroactive alteration is mathematically detectable),
   * but does not inherently provide storage-layer write-once immutability (WORM).
   */
  getSecurityModelNotice(): {
    model: string;
    guarantee: string;
    limitations: string;
    recommendation: string;
  } {
    return {
      model: 'Tamper-Evident SHA-256 Hash Chain',
      guarantee:
        'Cryptographic link ensures that any modified payload, omitted entry, or fabricated record breaks the hash chain and is flagged immediately during verification.',
      limitations:
        'A local attacker with direct disk/database write access could theoretically rewrite the entire table and recalculate hashes from scratch without an external witness or anchoring service.',
      recommendation:
        'For high-assurance regulatory compliance, pair NIMO-DECK tamper-evident audit logs with an external remote anchoring mechanism (e.g. daily Git commit tags, Google Drive snapshot manifests, or an append-only remote service).'
    };
  }
}
