import type { DeckDatabase } from '../database/connection.js';
import type { AuditLogEntry, AuditActor } from '@nimo-deck/shared';
export declare const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
export interface ChainVerificationResult {
    isValid: boolean;
    totalVerified: number;
    tamperedEntryId?: string;
    tamperedIndex?: number;
    reason?: string;
}
export declare class AuditLogRepository {
    private db;
    constructor(db: DeckDatabase);
    getLatestEntry(): AuditLogEntry | null;
    appendLog(params: {
        projectId?: string | null;
        actor: AuditActor;
        action: string;
        payload: unknown;
    }): AuditLogEntry;
    listLogs(projectId?: string, limit?: number): AuditLogEntry[];
    /**
     * Verifies the cryptographic integrity of the entire audit chain from genesis to head.
     */
    verifyChainIntegrity(): ChainVerificationResult;
}
//# sourceMappingURL=audit-log-repository.d.ts.map