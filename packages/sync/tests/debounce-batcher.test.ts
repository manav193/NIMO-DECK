import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DebounceBatcher, type ChangeBatch } from '../src/index.js';

describe('@nimo-deck/sync: DebounceBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should coalesce rapid file events within the quiet window into a single batch', () => {
    const batcher = new DebounceBatcher('/mock/repo', { inactivityMs: 1000, maxWaitMs: 5000 });
    const batches: ChangeBatch[] = [];

    batcher.on('batch', (b) => batches.push(b));

    // Rapid burst of 3 file events
    batcher.addEvent({ path: 'src/a.ts', type: 'change', timestamp: Date.now() });
    vi.advanceTimersByTime(400);

    batcher.addEvent({ path: 'src/b.ts', type: 'add', timestamp: Date.now() });
    vi.advanceTimersByTime(400);

    batcher.addEvent({ path: 'src/a.ts', type: 'change', timestamp: Date.now() });
    expect(batches).toHaveLength(0); // Still within quiet window

    // Advance past quiet window (1000ms after last event)
    vi.advanceTimersByTime(1050);

    expect(batches).toHaveLength(1);
    expect(batches[0].paths).toEqual(['src/a.ts', 'src/b.ts']); // Deduplicated
    expect(batches[0].events).toHaveLength(3);

    batcher.dispose();
  });

  it('should force a batch emission when the maxWaitMs ceiling is reached', () => {
    const batcher = new DebounceBatcher('/mock/repo', { inactivityMs: 1000, maxWaitMs: 3000 });
    const batches: ChangeBatch[] = [];

    batcher.on('batch', (b) => batches.push(b));

    // Continuous writing every 500ms (would perpetually reset 1000ms inactivity timer)
    for (let i = 0; i < 7; i++) {
      batcher.addEvent({ path: `src/file_${i}.ts`, type: 'change', timestamp: Date.now() });
      vi.advanceTimersByTime(500);
    }

    // At 3500ms elapsed, maxWaitMs (3000ms) must have forced a flush
    expect(batches.length).toBeGreaterThanOrEqual(1);

    batcher.dispose();
  });
});
