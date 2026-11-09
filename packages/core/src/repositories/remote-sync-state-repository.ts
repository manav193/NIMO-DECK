import { eq, and } from 'drizzle-orm';
import type { DeckDatabase } from '../database/connection.js';
import { remoteSyncStates } from '../database/schema.js';
import type { RemoteSyncState, RemoteSyncStatus } from '@nimo-deck/shared';
import crypto from 'node:crypto';

export class RemoteSyncStateRepository {
  constructor(private db: DeckDatabase) {}

  upsertState(params: {
    projectId: string;
    branchName: string;
    localHeadSha: string;
    remoteHeadSha: string;
    syncStatus: RemoteSyncStatus;
    lastSyncedAt?: Date;
  }): RemoteSyncState {
    const now = params.lastSyncedAt || new Date();

    const existing = this.db
      .select()
      .from(remoteSyncStates)
      .where(
        and(
          eq(remoteSyncStates.projectId, params.projectId),
          eq(remoteSyncStates.branchName, params.branchName)
        )
      )
      .get();

    if (existing) {
      this.db
        .update(remoteSyncStates)
        .set({
          localHeadSha: params.localHeadSha,
          remoteHeadSha: params.remoteHeadSha,
          syncStatus: params.syncStatus as 'IN_SYNC' | 'AHEAD' | 'BEHIND' | 'DIVERGED',
          lastSyncedAt: now
        })
        .where(eq(remoteSyncStates.id, existing.id))
        .run();

      return {
        id: existing.id,
        projectId: params.projectId,
        branchName: params.branchName,
        localHeadSha: params.localHeadSha,
        remoteHeadSha: params.remoteHeadSha,
        syncStatus: params.syncStatus as 'IN_SYNC' | 'AHEAD' | 'BEHIND' | 'DIVERGED',
        lastSyncedAt: now
      };
    }

    const id = crypto.randomUUID();
    const record: typeof remoteSyncStates.$inferInsert = {
      id,
      projectId: params.projectId,
      branchName: params.branchName,
      localHeadSha: params.localHeadSha,
      remoteHeadSha: params.remoteHeadSha,
      syncStatus: params.syncStatus as 'IN_SYNC' | 'AHEAD' | 'BEHIND' | 'DIVERGED',
      lastSyncedAt: now
    };

    this.db.insert(remoteSyncStates).values(record).run();

    return {
      id,
      projectId: params.projectId,
      branchName: params.branchName,
      localHeadSha: params.localHeadSha,
      remoteHeadSha: params.remoteHeadSha,
      syncStatus: params.syncStatus as 'IN_SYNC' | 'AHEAD' | 'BEHIND' | 'DIVERGED',
      lastSyncedAt: now
    };
  }

  getState(projectId: string, branchName: string): RemoteSyncState | null {
    const row = this.db
      .select()
      .from(remoteSyncStates)
      .where(
        and(
          eq(remoteSyncStates.projectId, projectId),
          eq(remoteSyncStates.branchName, branchName)
        )
      )
      .get();

    if (!row) return null;

    return {
      id: row.id,
      projectId: row.projectId,
      branchName: row.branchName,
      localHeadSha: row.localHeadSha,
      remoteHeadSha: row.remoteHeadSha,
      syncStatus: row.syncStatus,
      lastSyncedAt: row.lastSyncedAt
    };
  }

  listByProject(projectId: string): RemoteSyncState[] {
    const rows = this.db
      .select()
      .from(remoteSyncStates)
      .where(eq(remoteSyncStates.projectId, projectId))
      .all();

    return rows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      branchName: row.branchName,
      localHeadSha: row.localHeadSha,
      remoteHeadSha: row.remoteHeadSha,
      syncStatus: row.syncStatus,
      lastSyncedAt: row.lastSyncedAt
    }));
  }
}
