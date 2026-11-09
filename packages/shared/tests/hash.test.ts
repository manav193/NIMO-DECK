import { describe, it, expect } from 'vitest';
import { sha256, hashPayload, computeAuditChainHash } from '../src/index.js';

describe('@nimo-deck/shared: Cryptographic Hashing', () => {
  it('should compute valid 64-character SHA-256 hex digests', () => {
    const hash = sha256('hello nimo-deck');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should produce identical payload hashes regardless of object key insertion order', () => {
    const objA = { z: 100, a: 'test', m: true };
    const objB = { a: 'test', m: true, z: 100 };

    const hashA = hashPayload(objA);
    const hashB = hashPayload(objB);
    expect(hashA).toBe(hashB);
  });

  it('should compute tamper-evident audit log chain hashes', () => {
    const prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const entry1 = {
      prevLogHash: prevHash,
      id: 'uuid-1',
      actor: 'SYSTEM',
      action: 'GIT_COMMIT',
      payloadHash: sha256('payload1'),
      createdAt: 1700000000000
    };

    const hash1 = computeAuditChainHash(entry1);
    expect(hash1).toHaveLength(64);

    const entry2 = {
      prevLogHash: hash1,
      id: 'uuid-2',
      actor: 'USER',
      action: 'DRIVE_SNAPSHOT',
      payloadHash: sha256('payload2'),
      createdAt: 1700000001000
    };

    const hash2 = computeAuditChainHash(entry2);
    expect(hash2).toHaveLength(64);
    expect(hash2).not.toBe(hash1);
  });
});
