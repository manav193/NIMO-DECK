import { describe, it, expect } from 'vitest';
import { RepoMutex } from '../src/index.js';

describe('@nimo-deck/sync: RepoMutex Concurrency', () => {
  it('should enforce exclusive execution for operations on the same repository', async () => {
    const mutex = new RepoMutex();
    const repoPath = 'C:\\Projects\\App';
    const executionOrder: string[] = [];

    const op1 = async () => {
      const release = await mutex.acquire(repoPath);
      executionOrder.push('op1_start');
      await new Promise((r) => setTimeout(r, 50));
      executionOrder.push('op1_end');
      release();
    };

    const op2 = async () => {
      const release = await mutex.acquire(repoPath);
      executionOrder.push('op2_start');
      executionOrder.push('op2_end');
      release();
    };

    await Promise.all([op1(), op2()]);

    expect(executionOrder).toEqual([
      'op1_start',
      'op1_end',
      'op2_start',
      'op2_end'
    ]);
  });

  it('should allow concurrent executions on different repositories', async () => {
    const mutex = new RepoMutex();
    const repoA = 'C:\\Projects\\RepoA';
    const repoB = 'C:\\Projects\\RepoB';

    const releaseA = await mutex.acquire(repoA);
    const releaseB = await mutex.acquire(repoB);

    expect(mutex.isLocked(repoA)).toBe(true);
    expect(mutex.isLocked(repoB)).toBe(true);

    releaseA();
    expect(mutex.isLocked(repoA)).toBe(false);
    expect(mutex.isLocked(repoB)).toBe(true);

    releaseB();
    expect(mutex.isLocked(repoB)).toBe(false);
  });
});
