import { EventEmitter } from 'node:events';
import type { FileMutationEvent, ChangeBatch } from './types.js';

export interface DebounceBatcherOptions {
  inactivityMs?: number; // Quiet period (default 5000ms)
  maxWaitMs?: number;    // Hard ceiling (default 30000ms)
}

export interface DebounceBatcherEvents {
  batch: (batch: ChangeBatch) => void;
}

export class DebounceBatcher extends EventEmitter {
  private inactivityMs: number;
  private maxWaitMs: number;
  private pendingEvents: FileMutationEvent[] = [];
  private firstEventTime: number | null = null;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private maxWaitTimer: NodeJS.Timeout | null = null;

  constructor(
    public readonly repoPath: string,
    options: DebounceBatcherOptions = {}
  ) {
    super();
    this.inactivityMs = options.inactivityMs ?? 5000;
    this.maxWaitMs = options.maxWaitMs ?? 30000;
  }

  /**
   * Adds a file mutation event to the current debounce queue.
   */
  addEvent(event: FileMutationEvent): void {
    const now = Date.now();
    this.pendingEvents.push(event);

    if (this.firstEventTime === null) {
      this.firstEventTime = now;
      // Start hard ceiling timer
      this.maxWaitTimer = setTimeout(() => {
        this.flush();
      }, this.maxWaitMs);
    }

    // Reset quiet period timer
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    this.inactivityTimer = setTimeout(() => {
      this.flush();
    }, this.inactivityMs);
  }

  /**
   * Immediately flushes the pending batch if any events exist.
   */
  flush(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }

    if (this.pendingEvents.length === 0) {
      this.firstEventTime = null;
      return;
    }

    const events = [...this.pendingEvents];
    const firstEventTimestamp = this.firstEventTime ?? Date.now();
    const lastEventTimestamp = Date.now();

    // Deduplicate paths
    const uniquePaths = Array.from(new Set(events.map((e) => e.path)));

    this.pendingEvents = [];
    this.firstEventTime = null;

    const batch: ChangeBatch = {
      repoPath: this.repoPath,
      events,
      paths: uniquePaths,
      firstEventTimestamp,
      lastEventTimestamp
    };

    this.emit('batch', batch);
  }

  /**
   * Cleans up timers without emitting.
   */
  dispose(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }
    this.pendingEvents = [];
    this.firstEventTime = null;
    this.removeAllListeners();
  }

  getPendingCount(): number {
    return this.pendingEvents.length;
  }
}
