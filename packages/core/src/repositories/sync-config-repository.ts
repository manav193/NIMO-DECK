import { eq } from 'drizzle-orm';
import type { DeckDatabase } from '../database/connection.js';
import { syncConfigs } from '../database/schema.js';
import type { SyncConfig, UpdateSyncConfigInput } from '@nimo-deck/shared';

export class SyncConfigRepository {
  constructor(private db: DeckDatabase) {}

  getByProjectId(projectId: string): SyncConfig | null {
    const row = this.db
      .select()
      .from(syncConfigs)
      .where(eq(syncConfigs.projectId, projectId))
      .get();

    if (!row) return null;

    return {
      projectId: row.projectId,
      autoCommitEnabled: row.autoCommitEnabled,
      debounceWindowMs: row.debounceWindowMs,
      maxWaitMs: row.maxWaitMs,
      autoPushMode: row.autoPushMode,
      pushIntervalSec: row.pushIntervalSec,
      aiCommitMessages: row.aiCommitMessages,
      dryRunMode: row.dryRunMode,
      updatedAt: row.updatedAt
    };
  }

  update(projectId: string, input: UpdateSyncConfigInput): SyncConfig | null {
    const now = new Date();
    const updateValues: Partial<typeof syncConfigs.$inferInsert> = {
      updatedAt: now
    };

    if (input.autoCommitEnabled !== undefined) updateValues.autoCommitEnabled = input.autoCommitEnabled;
    if (input.debounceWindowMs !== undefined) updateValues.debounceWindowMs = input.debounceWindowMs;
    if (input.maxWaitMs !== undefined) updateValues.maxWaitMs = input.maxWaitMs;
    if (input.autoPushMode !== undefined) updateValues.autoPushMode = input.autoPushMode as 'OFF' | 'ON_COMMIT' | 'SCHEDULED';
    if (input.pushIntervalSec !== undefined) updateValues.pushIntervalSec = input.pushIntervalSec;
    if (input.aiCommitMessages !== undefined) updateValues.aiCommitMessages = input.aiCommitMessages;
    if (input.dryRunMode !== undefined) updateValues.dryRunMode = input.dryRunMode;

    this.db
      .update(syncConfigs)
      .set(updateValues)
      .where(eq(syncConfigs.projectId, projectId))
      .run();

    return this.getByProjectId(projectId);
  }
}
