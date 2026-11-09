import fs from 'node:fs';
import path from 'node:path';

export interface LockfileStatus {
  hasLock: boolean;
  lockPath: string;
  ageMs: number;
  isStale: boolean;
}

export class GitLockMonitor {
  /**
   * Checks if .git/index.lock exists and whether it is stale.
   */
  checkLock(repoPath: string, staleThresholdMs = 60000): LockfileStatus {
    const lockPath = path.join(repoPath, '.git', 'index.lock');

    if (!fs.existsSync(lockPath)) {
      return {
        hasLock: false,
        lockPath,
        ageMs: 0,
        isStale: false
      };
    }

    try {
      const stats = fs.statSync(lockPath);
      const ageMs = Date.now() - stats.mtimeMs;
      const isStale = ageMs >= staleThresholdMs;

      return {
        hasLock: true,
        lockPath,
        ageMs,
        isStale
      };
    } catch {
      return {
        hasLock: false,
        lockPath,
        ageMs: 0,
        isStale: false
      };
    }
  }

  /**
   * Safely clears an orphaned .git/index.lock if verified as stale.
   */
  clearStaleLock(repoPath: string, staleThresholdMs = 60000): boolean {
    const status = this.checkLock(repoPath, staleThresholdMs);
    if (status.hasLock && status.isStale) {
      try {
        fs.unlinkSync(status.lockPath);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}
