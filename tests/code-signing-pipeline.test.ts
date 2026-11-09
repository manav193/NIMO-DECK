import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { isImmutableIgnored } from '@nimo-deck/shared';

describe('Windows Authenticode & Smart App Control Pipeline', () => {
  const rootDir = path.resolve(__dirname, '..');
  const verifyScript = path.join(rootDir, 'scripts', 'verify-signatures.ps1');
  const signScript = path.join(rootDir, 'scripts', 'sign-binaries.ps1');
  const desktopPackageJson = path.join(rootDir, 'apps', 'desktop', 'package.json');

  it('provides the code signing and verification scripts', () => {
    expect(fs.existsSync(verifyScript)).toBe(true);
    expect(fs.existsSync(signScript)).toBe(true);

    const verifyContent = fs.readFileSync(verifyScript, 'utf-8');
    const signContent = fs.readFileSync(signScript, 'utf-8');

    expect(verifyContent).toContain('Get-AuthenticodeSignature');
    expect(verifyContent).toContain('Smart App Control');
    expect(verifyContent).toContain('TimeStamperCertificate');
    expect(verifyContent).toContain('SHA-256');

    expect(signContent).toContain('Set-AuthenticodeSignature');
    expect(signContent).toContain('CSC_LINK');
    expect(signContent).toContain('CSC_KEY_PASSWORD');
    expect(signContent).toContain('CSC_THUMBPRINT');
    expect(signContent).toContain('http://timestamp.digicert.com');
  });

  it('configures electron-builder with SHA-256 and RFC 3161 timestamp server', () => {
    const pkg = JSON.parse(fs.readFileSync(desktopPackageJson, 'utf-8'));
    expect(pkg.build?.win?.signingHashAlgorithms).toContain('sha256');
    expect(pkg.build?.win?.rfc3161TimeStampServer).toBe('http://timestamp.digicert.com');
  });

  it('strictly blocks code signing certificates and private keys from Git and synchronization', () => {
    const sensitiveFiles = [
      'certs/release.pfx',
      'signing/cert.p12',
      'keys/private.key',
      'secrets/cert.pem',
      'ssl/authenticode.cer',
      'crypto/identity.crt'
    ];

    for (const file of sensitiveFiles) {
      expect(isImmutableIgnored(file)).toBe(true);
    }

    const gitignore = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('*.pfx');
    expect(gitignore).toContain('*.p12');
    expect(gitignore).toContain('*.key');
    expect(gitignore).toContain('*.pem');
    expect(gitignore).toContain('*.cer');
    expect(gitignore).toContain('*.crt');
  });

  it('runs signature audit and rejects non-compliant releases in strict mode', { timeout: 30000 }, () => {
    // In local dev without certificate, running without -Strict succeeds and outputs diagnostic
    const auditOutput = execSync('powershell -ExecutionPolicy Bypass -File scripts/verify-signatures.ps1', {
      cwd: rootDir,
      encoding: 'utf-8'
    });

    expect(auditOutput).toContain('NIMO-DECK Authenticode Signature Verification Gate');
    expect(auditOutput).toContain('Audit Summary');

    // In strict mode without valid CA signatures, it must throw (exit code 1)
    expect(() => {
      execSync('powershell -ExecutionPolicy Bypass -File scripts/verify-signatures.ps1 -Strict', {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe']
      });
    }).toThrow();
  });
});
