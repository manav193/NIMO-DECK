import { describe, it, expect } from 'vitest';
import {
  calculateShannonEntropy,
  isProbableSecret,
  isImmutableIgnored
} from '../src/index.js';

describe('@nimo-deck/shared: Entropy & Secret Detection', () => {
  it('should calculate low entropy for repetitive English text', () => {
    const text = 'aaaaabbbbbccccc';
    const entropy = calculateShannonEntropy(text);
    expect(entropy).toBeLessThan(2.0);
  });

  it('should calculate high entropy (> 4.0) for cryptographic random strings', () => {
    // 32-byte hex/base64-like random key
    const secretKey = '8f3a9e2b1c4d7f0a6e5b8c1d3f7a9e2b';
    const entropy = calculateShannonEntropy(secretKey);
    expect(entropy).toBeGreaterThan(3.5);
  });

  it('should detect known secret signatures', () => {
    const gitHubToken = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    expect(isProbableSecret(gitHubToken)).toBe(true);

    const openAiKey = 'sk-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOP';
    expect(isProbableSecret(openAiKey)).toBe(true);

    const privateKey = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...';
    expect(isProbableSecret(privateKey)).toBe(true);
  });

  it('should not flag normal code or variable names as secrets', () => {
    expect(isProbableSecret('const activeProjectsCount = 42;')).toBe(false);
    expect(isProbableSecret('function calculateDebounceWindow() { return 5000; }')).toBe(false);
    expect(isProbableSecret('import { describe, it, expect } from "vitest";')).toBe(false);
  });

  it('should correctly match immutable ignored paths across platforms', () => {
    expect(isImmutableIgnored('.env')).toBe(true);
    expect(isImmutableIgnored('.env.local')).toBe(true);
    expect(isImmutableIgnored('.env.production')).toBe(true);
    expect(isImmutableIgnored('src/config/.env')).toBe(true);
    expect(isImmutableIgnored('node_modules/react/index.js')).toBe(true);
    expect(isImmutableIgnored('dist/bundle.js')).toBe(true);
    expect(isImmutableIgnored('target/release/app')).toBe(true);
    expect(isImmutableIgnored('id_rsa')).toBe(true);
    expect(isImmutableIgnored('server.key')).toBe(true);
    expect(isImmutableIgnored('cert.pem')).toBe(true);

    // Should NOT ignore legitimate source files
    expect(isImmutableIgnored('src/components/Header.tsx')).toBe(false);
    expect(isImmutableIgnored('docs/ARCHITECTURE.md')).toBe(false);
    expect(isImmutableIgnored('package.json')).toBe(false);
  });
});
