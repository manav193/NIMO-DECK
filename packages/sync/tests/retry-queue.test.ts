import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RetryQueue } from '../src/index.js';

describe('@nimo-deck/sync: RetryQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should enqueue and retry failed operations with backoff', async () => {
    const queue = new RetryQueue({ baseDelayMs: 1000, maxDelayMs: 5000, maxAttempts: 3 });
    let attempts = 0;

    queue.enqueue({
      id: 'task-1',
      projectId: 'p-1',
      repoPath: '/repo',
      operation: async () => {
        attempts++;
        if (attempts < 2) {
          return false; // Fail first attempt
        }
        return true; // Succeed second attempt
      }
    });

    expect(queue.getPendingTasksCount()).toBe(1);

    // Advance timer past first tick & execution
    await vi.advanceTimersByTimeAsync(3000);
    expect(attempts).toBe(1);

    // Advance past retry backoff & second execution
    await vi.advanceTimersByTimeAsync(4000);
    expect(attempts).toBe(2);
    expect(queue.getPendingTasksCount()).toBe(0);

    queue.clear();
  });

  it('should drop task after exceeding max attempts', async () => {
    const queue = new RetryQueue({ baseDelayMs: 500, maxDelayMs: 2000, maxAttempts: 2 });
    let attempts = 0;

    queue.enqueue({
      id: 'task-fail',
      projectId: 'p-1',
      repoPath: '/repo',
      maxAttempts: 2,
      operation: async () => {
        attempts++;
        return false; // Always fail
      }
    });

    await vi.advanceTimersByTimeAsync(10000);
    expect(attempts).toBe(2);
    expect(queue.getPendingTasksCount()).toBe(0);

    queue.clear();
  });
});
