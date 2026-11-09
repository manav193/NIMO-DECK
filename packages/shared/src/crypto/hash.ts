import { createHash } from 'node:crypto';

/**
 * Computes the SHA-256 hex digest of a string or Buffer.
 */
export function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Deterministically computes the SHA-256 hash of an arbitrary JSON-serializable object.
 */
export function hashPayload(payload: unknown): string {
  const json = JSON.stringify(payload, Object.keys(payload as object || {}).sort());
  return sha256(json);
}

/**
 * Computes a cryptographic hash chain entry for tamper-evident audit logging.
 */
export function computeAuditChainHash(params: {
  prevLogHash: string;
  id: string;
  actor: string;
  action: string;
  payloadHash: string;
  createdAt: number;
}): string {
  const data = `${params.prevLogHash}:${params.id}:${params.actor}:${params.action}:${params.payloadHash}:${params.createdAt}`;
  return sha256(data);
}
