import type { RateLimitInfo } from './types.js';

export class GitHubRateLimiter {
  private currentRateLimit: RateLimitInfo | null = null;

  /**
   * Updates rate limit tracking from HTTP response headers.
   */
  updateFromHeaders(headers: Headers): RateLimitInfo | null {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');
    const used = headers.get('x-ratelimit-used');

    if (limit && remaining && reset) {
      this.currentRateLimit = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        resetTimestamp: parseInt(reset, 10),
        used: used ? parseInt(used, 10) : 0
      };
      return this.currentRateLimit;
    }

    return null;
  }

  getRateLimit(): RateLimitInfo | null {
    return this.currentRateLimit;
  }

  isRateLimited(): boolean {
    if (!this.currentRateLimit) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    return this.currentRateLimit.remaining <= 0 && this.currentRateLimit.resetTimestamp > nowSec;
  }

  getMsUntilReset(): number {
    if (!this.currentRateLimit) return 0;
    const nowMs = Date.now();
    const resetMs = this.currentRateLimit.resetTimestamp * 1000;
    return Math.max(0, resetMs - nowMs);
  }
}
