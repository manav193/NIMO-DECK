import { eq, desc } from 'drizzle-orm';
import type { DeckDatabase } from '../database/connection.js';
import { syncEvents } from '../database/schema.js';
import type { SyncEvent, SyncEventType, SyncEventStatus } from '@nimo-deck/shared';
import crypto from 'node:crypto';

export class SyncEventRepository {
  constructor(private db: DeckDatabase) {}

  logEvent(params: {
    projectId: string;
    eventType: SyncEventType;
    status: SyncEventStatus;
    details: Record<string, unknown>;
    createdAt?: Date;
  }): SyncEvent {
    const id = crypto.randomUUID();
    const now = params.createdAt || new Date();

    const record: typeof syncEvents.$inferInsert = {
      id,
      projectId: params.projectId,
      eventType: String(params.eventType),
      status: params.status as 'SUCCESS' | 'PENDING' | 'FAILED',
      detailsJson: JSON.stringify(params.details),
      createdAt: now
    };

    this.db.insert(syncEvents).values(record).run();

    return {
      id,
      projectId: params.projectId,
      eventType: params.eventType as SyncEventType,
      status: params.status as 'SUCCESS' | 'PENDING' | 'FAILED',
      details: params.details,
      createdAt: now
    };
  }

  listByProject(projectId: string, limit = 50): SyncEvent[] {
    const rows = this.db
      .select()
      .from(syncEvents)
      .where(eq(syncEvents.projectId, projectId))
      .orderBy(desc(syncEvents.createdAt))
      .limit(limit)
      .all();

    return rows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      eventType: row.eventType as SyncEventType,
      status: row.status,
      details: JSON.parse(row.detailsJson),
      createdAt: row.createdAt
    }));
  }
}
