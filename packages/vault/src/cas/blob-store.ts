import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { sha256 } from '@nimo-deck/shared';

export interface StoreResult {
  hash: string;
  sizeBytes: number;
  storedBytes: number;
  wasNew: boolean;
}

export class BlobStore {
  private blobsDir: string;
  private compress: boolean;

  constructor(vaultDir: string, compress = true) {
    this.blobsDir = path.join(vaultDir, 'blobs');
    this.compress = compress;
    if (!fs.existsSync(this.blobsDir)) {
      fs.mkdirSync(this.blobsDir, { recursive: true });
    }
  }

  private getBlobPath(hash: string): string {
    const prefix = hash.slice(0, 2);
    return path.join(this.blobsDir, prefix, hash);
  }

  /**
   * Stores a buffer into content-addressed storage.
   * If a blob with the identical SHA-256 already exists, reuses it without duplicate write.
   */
  store(content: Buffer): StoreResult {
    const hash = sha256(content);
    const blobPath = this.getBlobPath(hash);

    if (fs.existsSync(blobPath)) {
      const stat = fs.statSync(blobPath);
      return {
        hash,
        sizeBytes: content.length,
        storedBytes: stat.size,
        wasNew: false
      };
    }

    const dir = path.dirname(blobPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const payload = this.compress ? zlib.deflateSync(content) : content;
    fs.writeFileSync(blobPath, payload);

    return {
      hash,
      sizeBytes: content.length,
      storedBytes: payload.length,
      wasNew: true
    };
  }

  /**
   * Retrieves a stored buffer by its SHA-256 hash.
   */
  read(hash: string): Buffer {
    const blobPath = this.getBlobPath(hash);
    if (!fs.existsSync(blobPath)) {
      throw new Error(`[BlobStore] Missing blob for hash: ${hash}`);
    }

    const raw = fs.readFileSync(blobPath);
    try {
      return this.compress ? zlib.inflateSync(raw) : raw;
    } catch {
      // If inflate fails (e.g. uncompressed raw blob), return raw
      return raw;
    }
  }

  has(hash: string): boolean {
    return fs.existsSync(this.getBlobPath(hash));
  }

  verify(hash: string): boolean {
    try {
      const buffer = this.read(hash);
      return sha256(buffer) === hash;
    } catch {
      return false;
    }
  }

  delete(hash: string): boolean {
    const blobPath = this.getBlobPath(hash);
    if (fs.existsSync(blobPath)) {
      fs.unlinkSync(blobPath);
      return true;
    }
    return false;
  }

  listBlobs(): string[] {
    const hashes: string[] = [];
    if (!fs.existsSync(this.blobsDir)) return hashes;

    const prefixes = fs.readdirSync(this.blobsDir, { withFileTypes: true });
    for (const p of prefixes) {
      if (p.isDirectory() && p.name.length === 2) {
        const pDir = path.join(this.blobsDir, p.name);
        const files = fs.readdirSync(pDir);
        hashes.push(...files);
      }
    }

    return hashes;
  }
}
