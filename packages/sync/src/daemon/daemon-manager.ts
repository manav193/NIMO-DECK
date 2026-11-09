import { RepoFileWatcher } from '../watcher/file-watcher.js';
import { SyncCoordinator } from '../sync/sync-coordinator.js';
import type { SyncResult } from '../sync/types.js';

export interface MonitoredProject {
  projectId: string;
  repoPath: string;
  watcher: RepoFileWatcher;
  isActive: boolean;
}

export class SyncDaemonManager {
  private monitoredProjects = new Map<string, MonitoredProject>();

  constructor(private coordinator: SyncCoordinator = new SyncCoordinator()) {}

  /**
   * Registers and starts monitoring a repository.
   */
  watchProject(
    projectId: string,
    repoPath: string,
    options: { inactivityMs?: number; maxWaitMs?: number } = {}
  ): void {
    if (this.monitoredProjects.has(projectId)) {
      return;
    }

    const watcher = new RepoFileWatcher(repoPath, options);

    watcher.on('batch', async (_batch) => {
      try {
        await this.coordinator.syncRepository(projectId, repoPath);
      } catch (err) {
        console.error(`[SyncDaemonManager] Error syncing project ${projectId}:`, err);
      }
    });

    watcher.start();

    this.monitoredProjects.set(projectId, {
      projectId,
      repoPath,
      watcher,
      isActive: true
    });
  }

  /**
   * Unregisters and stops monitoring a repository.
   */
  async unwatchProject(projectId: string): Promise<boolean> {
    const entry = this.monitoredProjects.get(projectId);
    if (!entry) return false;

    await entry.watcher.stop();
    this.monitoredProjects.delete(projectId);
    return true;
  }

  /**
   * Triggers an immediate manual synchronization for a registered project.
   */
  async triggerManualSync(projectId: string, dryRun = false): Promise<SyncResult | null> {
    const entry = this.monitoredProjects.get(projectId);
    if (!entry) return null;

    return this.coordinator.syncRepository(projectId, entry.repoPath, { dryRun });
  }

  /**
   * Pauses monitoring across all or a specific repository.
   */
  pause(projectId?: string): void {
    if (projectId) {
      const entry = this.monitoredProjects.get(projectId);
      if (entry) {
        entry.watcher.pause();
        entry.isActive = false;
      }
    } else {
      for (const entry of this.monitoredProjects.values()) {
        entry.watcher.pause();
        entry.isActive = false;
      }
    }
  }

  /**
   * Resumes monitoring.
   */
  resume(projectId?: string): void {
    if (projectId) {
      const entry = this.monitoredProjects.get(projectId);
      if (entry) {
        entry.watcher.resume();
        entry.isActive = true;
      }
    } else {
      for (const entry of this.monitoredProjects.values()) {
        entry.watcher.resume();
        entry.isActive = true;
      }
    }
  }

  /**
   * Stops all active watchers and shuts down the daemon.
   */
  async shutdown(): Promise<void> {
    for (const entry of this.monitoredProjects.values()) {
      await entry.watcher.stop();
    }
    this.monitoredProjects.clear();
  }

  getMonitoredCount(): number {
    return this.monitoredProjects.size;
  }

  isWatching(projectId: string): boolean {
    return this.monitoredProjects.has(projectId);
  }
}
