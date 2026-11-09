import type { DeckDatabase } from '../database/connection.js';
import type { SyncConfig, UpdateSyncConfigInput } from '@nimo-deck/shared';
export declare class SyncConfigRepository {
    private db;
    constructor(db: DeckDatabase);
    getByProjectId(projectId: string): SyncConfig | null;
    update(projectId: string, input: UpdateSyncConfigInput): SyncConfig | null;
}
//# sourceMappingURL=sync-config-repository.d.ts.map