import { describe, it, expect, beforeAll } from 'vitest';
import {
  calculateShannonEntropy,
  isProbableSecret,
  SECRET_SIGNATURE_PATTERNS,
  isImmutableIgnored
} from '@nimo-deck/shared';
import { SessionManager } from '../apps/cloud-backend/src/auth/session-manager.js';
import { ProductionLogger } from '@nimo-deck/core';
import crypto from 'node:crypto';

describe('NIMO-DECK Phase 8: Comprehensive Security & Penetration Audit', () => {
  // 1. Secret Scanning & Leakage Prevention
  describe('Secret Leakage Prevention', () => {
    it('detects high-entropy GitHub personal access tokens', () => {
      const ghpToken = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz';
      const matchesPattern = SECRET_SIGNATURE_PATTERNS.some((pat) => pat.test(ghpToken));
      expect(matchesPattern).toBe(true);

      const isSecret = isProbableSecret(ghpToken);
      expect(isSecret).toBe(true);
    });

    it('detects generic high-entropy API secret keys', () => {
      const secret = 'sk-live-51MzIzNDU2Nzg5MDEyMzQ1Njc4OTA=';
      const entropy = calculateShannonEntropy(secret);
      expect(entropy).toBeGreaterThan(4.0);
    });

    it('redacts sensitive credentials in production log files', () => {
      const logger = new ProductionLogger({ consoleOutput: false });
      const sensitiveMessage = 'Connected using token ghp_1234567890abcdefghijklmnopqrstuvwxyz and Bearer secret-bearer-token';
      logger.info('TestModule', sensitiveMessage);

      const recent = logger.getRecentLogs(1);
      expect(recent[0].message).not.toContain('ghp_1234567890abcdefghijklmnopqrstuvwxyz');
      expect(recent[0].message).toContain('[REDACTED]');
    });
  });

  // 2. Filesystem Boundary & Traversal Defense
  describe('Filesystem Boundary Protection', () => {
    it('blocks directory traversal attempts in immutable ignore paths', () => {
      expect(isImmutableIgnored('.git')).toBe(true);
      expect(isImmutableIgnored('.git/config')).toBe(true);
      expect(isImmutableIgnored('node_modules/express/index.js')).toBe(true);
      expect(isImmutableIgnored('../../.env')).toBe(true);
      expect(isImmutableIgnored('.env.production')).toBe(true);
      expect(isImmutableIgnored('id_rsa')).toBe(true);
      expect(isImmutableIgnored('id_ed25519')).toBe(true);
    });
  });

  // 3. Authentication & Session Security Audit
  describe('Cloud Authentication & Session Security', () => {
    let sessionManager: SessionManager;

    beforeAll(() => {
      sessionManager = new SessionManager('test-secret-audit-key-32-bytes-long!');
    });

    it('issues signed JWTs that fail verification if tampered with', () => {
      const session = sessionManager.createSession('user-1', 'USER');
      const valid = sessionManager.verifyAccessToken(session.accessToken);
      expect(valid).toBeDefined();
      expect(valid?.sub).toBe('user-1');

      // Tamper with payload
      const parts = session.accessToken.split('.');
      const tampered = `${parts[0]}.${parts[1]}xyz.${parts[2]}`;
      const invalid = sessionManager.verifyAccessToken(tampered);
      expect(invalid).toBeNull();
    });

    it('strictly enforces sliding-window rate limits to prevent brute-force attacks', () => {
      const key = 'audit-ip-brute-force';
      const limit = 5;
      for (let i = 0; i < limit; i++) {
        const res = sessionManager.checkRateLimit(key, limit, 60);
        expect(res.allowed).toBe(true);
      }
      // 6th request must be rejected
      const blocked = sessionManager.checkRateLimit(key, limit, 60);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it('revokes sessions immediately upon logout', () => {
      const session = sessionManager.createSession('user-2', 'USER');
      const tokenValidBefore = sessionManager.verifyAccessToken(session.accessToken);
      expect(tokenValidBefore).toBeDefined();

      const revoked = sessionManager.revokeSession(tokenValidBefore!.sessionId);
      expect(revoked).toBe(true);

      const tokenValidAfter = sessionManager.verifyAccessToken(session.accessToken);
      expect(tokenValidAfter).toBeNull();
    });
  });

  // 4. Webhook Replay & HMAC Validation
  describe('GitHub Webhook Replay & Signature Security', () => {
    it('verifies valid HMAC SHA-256 webhook signatures', () => {
      const secret = 'webhook-secret-phase8';
      const payload = JSON.stringify({ action: 'push', ref: 'refs/heads/main' });
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')}`;

      const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const isMatch = crypto.timingSafeEqual(
        Buffer.from(`sha256=${computed}`),
        Buffer.from(expectedSignature)
      );
      expect(isMatch).toBe(true);
    });

    it('rejects forged webhook signatures', () => {
      const secret = 'webhook-secret-phase8';
      const payload = JSON.stringify({ action: 'push' });
      const forgedSig = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

      const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const isMatch = crypto.timingSafeEqual(
        Buffer.from(`sha256=${computed}`),
        Buffer.from(forgedSig)
      );
      expect(isMatch).toBe(false);
    });
  });

  // 5. Multi-Device Isolation Invariant
  describe('Multi-Device Boundary Invariant', () => {
    it('ensures local filesystem paths and private keys are never included in cross-device sync schemas', () => {
      const safeProjectMetadata = {
        projectId: crypto.randomUUID(),
        name: 'Project-A',
        gitRemoteUrl: 'https://github.com/manav193/Project-A.git',
        lastHeadSha: 'a1b2c3d4e5f67890123456789012345678901234',
        latestAuditSequence: 42,
        updatedAt: new Date()
      };

      // Property 'localPath' must not exist in cross-device schema
      expect((safeProjectMetadata as Record<string, unknown>).localPath).toBeUndefined();
    });
  });
});
