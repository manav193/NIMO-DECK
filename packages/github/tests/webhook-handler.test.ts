import { describe, it, expect } from 'vitest';
import { GitHubWebhookHandler } from '../src/index.js';
import crypto from 'node:crypto';

describe('@nimo-deck/github: GitHubWebhookHandler', () => {
  const secret = 'super-secure-webhook-secret-12345';
  const handler = new GitHubWebhookHandler({ secret });

  it('should validate legitimate webhook requests with valid HMAC-SHA256 signature', () => {
    const rawBody = JSON.stringify({ action: 'opened', repository: { full_name: 'manav193/NIMO-DECK' } });
    const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const signatureHeader = `sha256=${hmac}`;

    const res = handler.validateRequest({
      rawBody,
      signatureHeader,
      deliveryId: 'delivery-uuid-1',
      eventType: 'issues'
    });

    expect(res.isValid).toBe(true);
    expect(res.eventType).toBe('issues');
    expect(res.deliveryId).toBe('delivery-uuid-1');
  });

  it('should reject requests with tampered payloads or invalid signatures', () => {
    const rawBody = JSON.stringify({ action: 'opened' });
    const tamperedBody = JSON.stringify({ action: 'closed' });
    const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const res = handler.validateRequest({
      rawBody: tamperedBody,
      signatureHeader: `sha256=${hmac}`,
      deliveryId: 'delivery-uuid-2',
      eventType: 'issues'
    });

    expect(res.isValid).toBe(false);
    expect(res.reason).toContain('signature mismatch');
  });

  it('should block replay attacks with duplicate delivery IDs', () => {
    const rawBody = JSON.stringify({ ref: 'refs/heads/main' });
    const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const signatureHeader = `sha256=${hmac}`;

    // First delivery is accepted
    const res1 = handler.validateRequest({
      rawBody,
      signatureHeader,
      deliveryId: 'delivery-replay-test',
      eventType: 'push'
    });
    expect(res1.isValid).toBe(true);

    // Second delivery with identical delivery ID must be blocked as replay attack
    const res2 = handler.validateRequest({
      rawBody,
      signatureHeader,
      deliveryId: 'delivery-replay-test',
      eventType: 'push'
    });
    expect(res2.isValid).toBe(false);
    expect(res2.reason).toContain('Replay attack detected');
  });
});
