export class RepoMutex {
  private activeLocks = new Set<string>();
  private waitQueues = new Map<string, (() => void)[]>();

  /**
   * Acquires an exclusive lock for a given repository path.
   * Resolves when the lock is acquired.
   */
  async acquire(repoPath: string): Promise<() => void> {
    const key = repoPath.toLowerCase();

    if (this.activeLocks.has(key)) {
      await new Promise<void>((resolve) => {
        const queue = this.waitQueues.get(key) || [];
        queue.push(resolve);
        this.waitQueues.set(key, queue);
      });
    }

    this.activeLocks.add(key);

    let released = false;
    return () => {
      if (released) return;
      released = true;

      const queue = this.waitQueues.get(key);
      if (queue && queue.length > 0) {
        const next = queue.shift();
        if (next) next();
      } else {
        this.activeLocks.delete(key);
        this.waitQueues.delete(key);
      }
    };
  }

  isLocked(repoPath: string): boolean {
    return this.activeLocks.has(repoPath.toLowerCase());
  }
}
