import crypto from 'node:crypto';
import type { WebhookValidationResult } from './types.js';

export interface WebhookHandlerOptions {
  secret?: string;
  replayTtlMs?: number; // Default 5 minutes
}

export class GitHubWebhookHandler {
  private secret?: string;
  private replayTtlMs: number;
  private processedDeliveries = new Map<string, number>();

  constructor(options: WebhookHandlerOptions = {}) {
    this.secret = options.secret;
    this.replayTtlMs = options.replayTtlMs ?? 5 * 60 * 1000;
  }

  setSecret(secret: string): void {
    this.secret = secret;
  }

  /**
   * Validates webhook HMAC-SHA256 signature and guards against replay attacks.
   */
  validateRequest(params: {
    rawBody: string;
    signatureHeader: string | null;
    deliveryId: string | null;
    eventType: string | null;
  }): WebhookValidationResult {
    // 1. Signature check
    if (this.secret) {
      if (!params.signatureHeader) {
        return {
          isValid: false,
          reason: 'Missing X-Hub-Signature-256 header'
        };
      }

      if (!params.signatureHeader.startsWith('sha256=')) {
        return {
          isValid: false,
          reason: 'Malformed signature header format'
        };
      }

      const providedSig = params.signatureHeader.replace('sha256=', '').trim();
      const hmac = crypto.createHmac('sha256', this.secret);
      hmac.update(params.rawBody);
      const computedSig = hmac.digest('hex');

      // Timing-safe comparison to prevent timing side-channel attacks
      const providedBuf = Buffer.from(providedSig, 'hex');
      const computedBuf = Buffer.from(computedSig, 'hex');

      if (
        providedBuf.length !== computedBuf.length ||
        !crypto.timingSafeEqual(providedBuf, computedBuf)
      ) {
        return {
          isValid: false,
          reason: 'HMAC-SHA256 signature mismatch'
        };
      }
    }

    // 2. Replay Protection check
    if (params.deliveryId) {
      this.pruneExpiredDeliveries();

      if (this.processedDeliveries.has(params.deliveryId)) {
        return {
          isValid: false,
          reason: `Replay attack detected: delivery ${params.deliveryId} was already processed.`
        };
      }

      this.processedDeliveries.set(params.deliveryId, Date.now());
    }

    return {
      isValid: true,
      eventType: params.eventType || undefined,
      deliveryId: params.deliveryId || undefined
    };
  }

  private pruneExpiredDeliveries(): void {
    const now = Date.now();
    for (const [id, timestamp] of this.processedDeliveries.entries()) {
      if (now - timestamp > this.replayTtlMs) {
        this.processedDeliveries.delete(id);
      }
    }
  }

  getProcessedDeliveriesCount(): number {
    return this.processedDeliveries.size;
  }
}
