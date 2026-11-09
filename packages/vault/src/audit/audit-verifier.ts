import type { AuditLogEntry } from '@nimo-deck/shared';
import { GENESIS_HASH, HashChainManager } from './hash-chain-manager.js';

export interface AuditVerificationReport {
  isValid: boolean;
  totalVerified: number;
  tamperedEntryId?: string;
  tamperedIndex?: number;
  reason?: string;
  tamperEvidentGuarantee: string;
}

export class AuditVerifier {
  /**
   * Verifies the cryptographic integrity of a sequence of audit records.
   * Returns a detailed verification report with tamper detection.
   */
  static verifyChain(entries: AuditLogEntry[]): AuditVerificationReport {
    const guarantee =
      'Tamper-evident verification confirms cryptographic continuity. Any altered payload, deleted row, or injected entry invalidates downstream SHA-256 hashes.';

    if (entries.length === 0) {
      return { isValid: true, totalVerified: 0, tamperEvidentGuarantee: guarantee };
    }

    // Sort ascending by createdAt or sequenceNum
    const sorted = [...entries].sort((a, b) => {
      if (a.sequenceNum !== undefined && b.sequenceNum !== undefined) {
        return a.sequenceNum - b.sequenceNum;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    let expectedPrevHash = GENESIS_HASH;
    let expectedSeq = 1;

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];

      // 1. Verify previous hash pointer
      if (entry.prevLogHash !== expectedPrevHash) {
        return {
          isValid: false,
          totalVerified: i,
          tamperedEntryId: entry.id,
          tamperedIndex: i,
          reason: `Previous hash pointer mismatch at index ${i}. Expected '${expectedPrevHash}', found '${entry.prevLogHash}'`,
          tamperEvidentGuarantee: guarantee
        };
      }

      // 2. Verify sequence number continuity if present
      if (entry.sequenceNum !== undefined) {
        if (i === 0) {
          expectedSeq = entry.sequenceNum;
        } else if (entry.sequenceNum !== expectedSeq) {
          return {
            isValid: false,
            totalVerified: i,
            tamperedEntryId: entry.id,
            tamperedIndex: i,
            reason: `Sequence break at index ${i}. Expected sequence ${expectedSeq}, found ${entry.sequenceNum}`,
            tamperEvidentGuarantee: guarantee
          };
        }
        expectedSeq++;
      }

      // 3. Recompute entry hash
      const recomputed = HashChainManager.computeEntryHash({
        prevLogHash: entry.prevLogHash,
        sequenceNum: entry.sequenceNum ?? (i + 1),
        id: entry.id,
        actor: entry.actor,
        action: entry.action,
        payloadHash: entry.payloadHash,
        createdAt: entry.createdAt.getTime()
      });

      if (recomputed !== entry.entryHash) {
        return {
          isValid: false,
          totalVerified: i,
          tamperedEntryId: entry.id,
          tamperedIndex: i,
          reason: `Entry hash mismatch at index ${i}. Record data or hash has been tampered with.`,
          tamperEvidentGuarantee: guarantee
        };
      }

      expectedPrevHash = entry.entryHash;
    }

    return {
      isValid: true,
      totalVerified: sorted.length,
      tamperEvidentGuarantee: guarantee
    };
  }
}
