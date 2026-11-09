import type { DeckDatabase } from '../database/connection.js';
import type { RemoteSyncState, RemoteSyncStatus } from '@nimo-deck/shared';
export declare class RemoteSyncStateRepository {
    private db;
    constructor(db: DeckDatabase);
    upsertState(params: {
        projectId: string;
        branchName: string;
        localHeadSha: string;
        remoteHeadSha: string;
        syncStatus: RemoteSyncStatus;
        lastSyncedAt?: Date;
    }): RemoteSyncState;
    getState(projectId: string, branchName: string): RemoteSyncState | null;
    listByProject(projectId: string): RemoteSyncState[];
}
//# sourceMappingURL=remote-sync-state-repository.d.ts.map