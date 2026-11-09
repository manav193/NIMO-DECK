/**
 * Computes the SHA-256 hex digest of a string or Buffer.
 */
export declare function sha256(data: string | Buffer): string;
/**
 * Deterministically computes the SHA-256 hash of an arbitrary JSON-serializable object.
 */
export declare function hashPayload(payload: unknown): string;
/**
 * Computes a cryptographic hash chain entry for tamper-evident audit logging.
 */
export declare function computeAuditChainHash(params: {
    prevLogHash: string;
    id: string;
    actor: string;
    action: string;
    payloadHash: string;
    createdAt: number;
}): string;
//# sourceMappingURL=hash.d.ts.map