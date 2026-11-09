import crypto from 'node:crypto';

export class LoopGuard {
  private static activeSyncTokens = new Map<string, number>();
  private static readonly TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Generates a new unique sync token and registers it in the loop guard.
   */
  static generateSyncToken(): string {
    this.pruneExpired();
    const token = crypto.randomUUID();
    this.activeSyncTokens.set(token, Date.now());
    return token;
  }

  /**
   * Checks whether a sync token was created by a recent NIMO-DECK drive operation.
   */
  static isKnownSyncToken(token: string): boolean {
    this.pruneExpired();
    return this.activeSyncTokens.has(token);
  }

  private static pruneExpired(): void {
    const now = Date.now();
    for (const [token, timestamp] of this.activeSyncTokens.entries()) {
      if (now - timestamp > this.TOKEN_TTL_MS) {
        this.activeSyncTokens.delete(token);
      }
    }
  }

  static getActiveTokensCount(): number {
    this.pruneExpired();
    return this.activeSyncTokens.size;
  }

  static clear(): void {
    this.activeSyncTokens.clear();
  }
}
