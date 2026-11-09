import { EventEmitter } from 'node:events';
import { watch, type FSWatcher } from 'chokidar';
import { isImmutableIgnored } from '@nimo-deck/shared';
import { DebounceBatcher, type DebounceBatcherOptions } from './debounce-batcher.js';
import type { ChangeBatch, MutationType } from './types.js';
import path from 'node:path';

export interface FileWatcherOptions extends DebounceBatcherOptions {
  customIgnored?: (string | RegExp)[];
}

export class RepoFileWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private batcher: DebounceBatcher;
  private isPaused = false;

  constructor(
    public readonly repoPath: string,
    private options: FileWatcherOptions = {}
  ) {
    super();
    this.batcher = new DebounceBatcher(repoPath, options);
    this.batcher.on('batch', (batch: ChangeBatch) => {
      if (!this.isPaused) {
        this.emit('batch', batch);
      }
    });
  }

  /**
   * Starts monitoring the repository directory.
   */
  start(): void {
    if (this.watcher) {
      return;
    }

    const ignoredFilter = (filePath: string): boolean => {
      const rel = path.relative(this.repoPath, filePath);
      if (isImmutableIgnored(rel) || isImmutableIgnored(filePath)) {
        return true;
      }

      if (this.options.customIgnored) {
        for (const rule of this.options.customIgnored) {
          if (typeof rule === 'string' && (rel.includes(rule) || filePath.includes(rule))) {
            return true;
          }
          if (rule instanceof RegExp && (rule.test(rel) || rule.test(filePath))) {
            return true;
          }
        }
      }

      return false;
    };

    this.watcher = watch(this.repoPath, {
      ignored: ignoredFilter,
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100
      }
    });

    const handleMutation = (type: MutationType, filePath: string) => {
      if (this.isPaused) return;

      const relPath = path.relative(this.repoPath, filePath);
      if (isImmutableIgnored(relPath)) return;

      this.batcher.addEvent({
        path: relPath,
        type,
        timestamp: Date.now()
      });
    };

    this.watcher.on('add', (p) => handleMutation('add', p));
    this.watcher.on('change', (p) => handleMutation('change', p));
    this.watcher.on('unlink', (p) => handleMutation('unlink', p));

    this.watcher.on('error', (err) => {
      this.emit('error', err);
    });
  }

  /**
   * Stops the watcher and cleans up resources.
   */
  async stop(): Promise<void> {
    this.batcher.dispose();
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  flush(): void {
    this.batcher.flush();
  }
}
