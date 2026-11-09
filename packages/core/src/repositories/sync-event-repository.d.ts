import type { DeckDatabase } from '../database/connection.js';
import type { SyncEvent, SyncEventType, SyncEventStatus } from '@nimo-deck/shared';
export declare class SyncEventRepository {
    private db;
    constructor(db: DeckDatabase);
    logEvent(params: {
        projectId: string;
        eventType: SyncEventType;
        status: SyncEventStatus;
        details: Record<string, unknown>;
        createdAt?: Date;
    }): SyncEvent;
    listByProject(projectId: string, limit?: number): SyncEvent[];
}
//# sourceMappingURL=sync-event-repository.d.ts.map