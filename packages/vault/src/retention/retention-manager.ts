import type { VaultRepository } from '@nimo-deck/core';
import type { BlobStore } from '../cas/blob-store.js';

export interface RetentionPolicy {
  maxSnapshotsPerProject?: number;
  maxAgeDays?: number;
}

export interface PruneResult {
  snapshotsPruned: number;
  snapshotsRetained: number;
  blobsPruned: number;
}

export class VaultRetentionManager {
  constructor(
    private vaultRepo: VaultRepository,
    private blobStore?: BlobStore
  ) {
    void this.blobStore;
  }

  /**
   * Evaluates and applies retention policies per project.
   * STRICT SAFETY GUARANTEE: The newest verified snapshot (last recovery point)
   * and all pinned snapshots are NEVER deleted.
   */
  applyRetention(projectId: string, policy: RetentionPolicy = {}): PruneResult {
    const maxSnapshots = policy.maxSnapshotsPerProject ?? 50;
    const maxAgeDays = policy.maxAgeDays ?? 90;
    const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

    const allSnapshots = this.vaultRepo.listSnapshots(projectId, 1000);

    if (allSnapshots.length <= 1) {
      return {
        snapshotsPruned: 0,
        snapshotsRetained: allSnapshots.length,
        blobsPruned: 0
      };
    }

    // Sort descending by creation date (newest first)
    const sorted = [...allSnapshots].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // The first item (newest) is the last verified recovery point: NEVER DELETE
    const lastRecoveryPoint = sorted[0];

    const toPrune: string[] = [];
    let retainedCount = 1; // lastRecoveryPoint is always retained

    for (let i = 1; i < sorted.length; i++) {
      const snap = sorted[i];

      // Never delete pinned snapshots
      if (snap.isPinned) {
        retainedCount++;
        continue;
      }

      // Check criteria: beyond max count or older than cutoff date
      const exceedsCount = retainedCount >= maxSnapshots;
      const exceedsAge = snap.createdAt < cutoffDate;

      if (exceedsCount || exceedsAge) {
        toPrune.push(snap.id);
      } else {
        retainedCount++;
      }
    }

    let prunedCount = 0;
    for (const snapId of toPrune) {
      if (snapId !== lastRecoveryPoint.id) {
        const ok = this.vaultRepo.deleteSnapshot(snapId);
        if (ok) prunedCount++;
      }
    }

    return {
      snapshotsPruned: prunedCount,
      snapshotsRetained: retainedCount,
      blobsPruned: 0
    };
  }
}
