import { describe, it, expect, beforeEach } from 'vitest';
import { LoopGuard } from '../src/index.js';

describe('@nimo-deck/drive: LoopGuard Sync Defense', () => {
  beforeEach(() => {
    LoopGuard.clear();
  });

  it('should generate and track active sync tokens', () => {
    const token1 = LoopGuard.generateSyncToken();
    const token2 = LoopGuard.generateSyncToken();

    expect(token1).toHaveLength(36);
    expect(LoopGuard.isKnownSyncToken(token1)).toBe(true);
    expect(LoopGuard.isKnownSyncToken(token2)).toBe(true);
    expect(LoopGuard.isKnownSyncToken('random-unknown-token')).toBe(false);
  });
});
