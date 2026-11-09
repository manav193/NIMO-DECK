import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PreCommitScanner } from '../src/index.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('@nimo-deck/sync: PreCommitScanner', () => {
  let tempDir: string;
  const scanner = new PreCommitScanner();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-scanner-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should allow legitimate clean source files', async () => {
    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    const safeFile = path.join(srcDir, 'App.tsx');
    fs.writeFileSync(safeFile, 'export function App() { return <h1>Hello</h1>; }');

    const result = await scanner.scan(tempDir, ['src/App.tsx']);
    expect(result.isSafe).toBe(true);
    expect(result.safeFiles).toContain('src/App.tsx');
    expect(result.quarantinedFiles).toHaveLength(0);
  });

  it('should quarantine immutable ignore patterns like .env files', async () => {
    const envFile = path.join(tempDir, '.env');
    fs.writeFileSync(envFile, 'DATABASE_URL=sqlite:///db.sqlite');

    const result = await scanner.scan(tempDir, ['.env']);
    expect(result.isSafe).toBe(false);
    expect(result.quarantinedFiles).toHaveLength(1);
    expect(result.quarantinedFiles[0].reason).toBe('IMMUTABLE_IGNORE');
  });

  it('should quarantine files containing high-confidence secret signatures', async () => {
    const tokenFile = path.join(tempDir, 'credentials.txt');
    fs.writeFileSync(
      tokenFile,
      'const token = "ghp_1234567890abcdefghijklmnopqrstuvwx";'
    );

    const result = await scanner.scan(tempDir, ['credentials.txt']);
    expect(result.isSafe).toBe(false);
    expect(result.quarantinedFiles).toHaveLength(1);
    expect(result.quarantinedFiles[0].reason).toBe('SECRET_SIGNATURE');
  });

  it('should quarantine files containing high-entropy random keys', async () => {
    const keyFile = path.join(tempDir, 'secret-key.txt');
    // High entropy 32-character random string
    fs.writeFileSync(keyFile, 'api_token = "4f7a9c2e1b8d6e3f5a0c9b7e4d2a1f8c"');

    const result = await scanner.scan(tempDir, ['secret-key.txt']);
    expect(result.isSafe).toBe(false);
    expect(result.quarantinedFiles).toHaveLength(1);
    expect(result.quarantinedFiles[0].reason).toBe('HIGH_ENTROPY_SECRET');
  });

  it('should prevent path traversal outside repository root', async () => {
    const result = await scanner.scan(tempDir, ['../../Windows/System32/config.sys']);
    expect(result.isSafe).toBe(false);
    expect(result.quarantinedFiles[0].details).toContain('Path traversal');
  });
});
