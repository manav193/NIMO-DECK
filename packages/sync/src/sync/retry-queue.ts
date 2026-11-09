export interface RetryTask {
  id: string;
  projectId: string;
  repoPath: string;
  operation: () => Promise<boolean>;
  attempts: number;
  maxAttempts: number;
  nextRunAt: number;
  lastError?: string;
}

export interface RetryQueueOptions {
  baseDelayMs?: number; // Default 2000ms
  maxDelayMs?: number;  // Default 60000ms
  maxAttempts?: number; // Default 5
}

export class RetryQueue {
  private tasks = new Map<string, RetryTask>();
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private baseDelayMs: number;
  private maxDelayMs: number;
  private defaultMaxAttempts: number;

  constructor(options: RetryQueueOptions = {}) {
    this.baseDelayMs = options.baseDelayMs ?? 2000;
    this.maxDelayMs = options.maxDelayMs ?? 60000;
    this.defaultMaxAttempts = options.maxAttempts ?? 5;
  }

  enqueue(params: {
    id: string;
    projectId: string;
    repoPath: string;
    operation: () => Promise<boolean>;
    maxAttempts?: number;
    error?: string;
  }): void {
    const attempts = 0;
    const delay = this.calculateDelay(attempts);

    const task: RetryTask = {
      id: params.id,
      projectId: params.projectId,
      repoPath: params.repoPath,
      operation: params.operation,
      attempts,
      maxAttempts: params.maxAttempts ?? this.defaultMaxAttempts,
      nextRunAt: Date.now() + delay,
      lastError: params.error
    };

    this.tasks.set(params.id, task);
    this.scheduleNextTick();
  }

  private calculateDelay(attempt: number): number {
    const exp = Math.min(this.maxDelayMs, this.baseDelayMs * Math.pow(2, attempt));
    const jitter = Math.floor(Math.random() * 500);
    return Math.min(this.maxDelayMs, exp + jitter);
  }

  private scheduleNextTick(): void {
    if (this.timer || this.tasks.size === 0) return;

    this.timer = setTimeout(async () => {
      this.timer = null;
      await this.processQueue();
    }, 1000);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const now = Date.now();
    for (const [id, task] of Array.from(this.tasks.entries())) {
      if (task.nextRunAt <= now) {
        task.attempts++;
        try {
          const success = await task.operation();
          if (success) {
            this.tasks.delete(id);
            continue;
          }
        } catch (err: unknown) {
          task.lastError = err instanceof Error ? err.message : String(err);
        }

        if (task.attempts >= task.maxAttempts) {
          // Exceeded max retry attempts
          this.tasks.delete(id);
        } else {
          task.nextRunAt = Date.now() + this.calculateDelay(task.attempts);
        }
      }
    }

    this.isProcessing = false;
    if (this.tasks.size > 0) {
      this.scheduleNextTick();
    }
  }

  getPendingTasksCount(): number {
    return this.tasks.size;
  }

  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.tasks.clear();
  }
}
