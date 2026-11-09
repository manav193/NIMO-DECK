import { describe, it, expect } from 'vitest';
import { GitHubRateLimiter } from '../src/index.js';

describe('@nimo-deck/github: GitHubRateLimiter', () => {
  it('should parse standard GitHub rate limit headers', () => {
    const limiter = new GitHubRateLimiter();
    const headers = new Headers({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '4990',
      'x-ratelimit-reset': '1800000000',
      'x-ratelimit-used': '10'
    });

    const info = limiter.updateFromHeaders(headers);
    expect(info).not.toBeNull();
    expect(info?.limit).toBe(5000);
    expect(info?.remaining).toBe(4990);
    expect(limiter.isRateLimited()).toBe(false);
  });

  it('should detect when rate limit is exhausted and compute remaining wait ms', () => {
    const limiter = new GitHubRateLimiter();
    const futureResetSec = Math.floor(Date.now() / 1000) + 120; // 120 seconds in future

    const headers = new Headers({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': String(futureResetSec)
    });

    limiter.updateFromHeaders(headers);
    expect(limiter.isRateLimited()).toBe(true);
    expect(limiter.getMsUntilReset()).toBeGreaterThan(100000); // ~120,000 ms
  });
});
