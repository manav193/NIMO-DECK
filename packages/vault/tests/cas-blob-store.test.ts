import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BlobStore } from '../src/cas/blob-store.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('@nimo-deck/vault: CAS BlobStore', () => {
  let tempDir: string;
  let blobStore: BlobStore;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nimo-deck-cas-'));
    blobStore = new BlobStore(tempDir, true);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should store and retrieve content by SHA-256 hash', () => {
    const data = Buffer.from('console.log("Hello, NIMO-DECK Vault CAS!");', 'utf-8');
    const result = blobStore.store(data);

    expect(result.hash).toHaveLength(64);
    expect(result.wasNew).toBe(true);
    expect(result.sizeBytes).toBe(data.length);
    expect(blobStore.has(result.hash)).toBe(true);

    const retrieved = blobStore.read(result.hash);
    expect(retrieved.toString('utf-8')).toBe(data.toString('utf-8'));
  });

  it('should deduplicate identical content on subsequent store calls', () => {
    const data = Buffer.from('export const PI = 3.14159265359;', 'utf-8');
    const first = blobStore.store(data);
    const second = blobStore.store(data);

    expect(first.wasNew).toBe(true);
    expect(second.wasNew).toBe(false);
    expect(first.hash).toBe(second.hash);
  });

  it('should verify blob integrity and detect missing or corrupted blobs', () => {
    const data = Buffer.from('Binary data with special bytes: \x00\xFF\xAA\x55', 'binary');
    const result = blobStore.store(data);

    expect(blobStore.verify(result.hash)).toBe(true);
    expect(blobStore.verify('non_existent_hash_00000000000000000000000000000000000000000000000000')).toBe(false);
  });

  it('should delete a stored blob', () => {
    const data = Buffer.from('Temporary blob to delete', 'utf-8');
    const result = blobStore.store(data);
    expect(blobStore.has(result.hash)).toBe(true);

    const deleted = blobStore.delete(result.hash);
    expect(deleted).toBe(true);
    expect(blobStore.has(result.hash)).toBe(false);
    expect(() => blobStore.read(result.hash)).toThrow(/Missing blob/);
  });
});
