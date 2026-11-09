import { hashPayload, computeAuditChainHash, sha256 } from '@nimo-deck/shared';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export interface ChainHashInput {
  prevLogHash: string;
  sequenceNum?: number;
  id: string;
  actor: string;
  action: string;
  payloadHash: string;
  createdAt: number;
}

export class HashChainManager {
  /**
   * Computes the deterministic SHA-256 hash for an audit record linking it to the previous entry.
   */
  static computeEntryHash(input: ChainHashInput): string {
    return computeAuditChainHash({
      prevLogHash: input.prevLogHash,
      id: input.id,
      actor: input.actor,
      action: input.action,
      payloadHash: input.payloadHash,
      createdAt: input.createdAt
    });
  }

  static computePayloadHash(payload: unknown): string {
    return hashPayload(payload);
  }

  static computeRawHash(data: string | Buffer): string {
    return sha256(data);
  }
}
