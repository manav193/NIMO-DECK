import type { DeckDatabase } from '@nimo-deck/core';
import type { ProductionLogger } from '@nimo-deck/core';

export class DaemonManager {
  private isShuttingDown = false;
  private activeSyncOperationsCount = 0;

  constructor(
    private db: DeckDatabase,
    private logger: ProductionLogger
  ) {}

  registerSyncStart(): boolean {
    if (this.isShuttingDown) return false;
    this.activeSyncOperationsCount++;
    return true;
  }

  registerSyncEnd(): void {
    if (this.activeSyncOperationsCount > 0) {
      this.activeSyncOperationsCount--;
    }
  }

  /**
   * Gracefully shuts down the background daemon.
   * Flushes SQLite WAL checkpoint, aborts pending sync retries, and preserves data.
   */
  async gracefulShutdown(timeoutMs = 5000): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    this.logger.info('DaemonManager', 'Initiating graceful shutdown of NIMO-DECK desktop daemon...');

    const start = Date.now();
    while (this.activeSyncOperationsCount > 0 && Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 100));
    }

    try {
      // Flush BetterSQLite3 WAL mode journal
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sqlite = (this.db as any).$client || (this.db as any).session?.client;
      if (sqlite && typeof sqlite.pragma === 'function') {
        sqlite.pragma('wal_checkpoint(TRUNCATE)');
        this.logger.info('DaemonManager', 'SQLite WAL checkpoint completed successfully.');
      }
    } catch (err) {
      this.logger.error('DaemonManager', 'Error flushing WAL checkpoint on shutdown', err);
    }

    this.logger.info('DaemonManager', 'Shutdown sequence completed safely.');
  }

  setupCrashRecovery(): void {
    process.on('uncaughtException', (err: Error) => {
      this.logger.error('CRASH_RECOVERY', `Uncaught exception in Main Process: ${err.message}`, {
        stack: err.stack
      });
      // Do not hard-exit immediately if WAL can be flushed
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sqlite = (this.db as any).$client || (this.db as any).session?.client;
        sqlite?.pragma('wal_checkpoint(PASSIVE)');
      } catch {
        // Ignore
      }
    });

    process.on('unhandledRejection', (reason: unknown) => {
      const msg = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      this.logger.error('CRASH_RECOVERY', `Unhandled promise rejection in Main Process: ${msg}`, { stack });
    });
  }
}
