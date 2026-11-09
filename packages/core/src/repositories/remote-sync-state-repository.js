"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteSyncStateRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_js_1 = require("../database/schema.js");
const node_crypto_1 = __importDefault(require("node:crypto"));
class RemoteSyncStateRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    upsertState(params) {
        const now = params.lastSyncedAt || new Date();
        const existing = this.db
            .select()
            .from(schema_js_1.remoteSyncStates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.remoteSyncStates.projectId, params.projectId), (0, drizzle_orm_1.eq)(schema_js_1.remoteSyncStates.branchName, params.branchName)))
            .get();
        if (existing) {
            this.db
                .update(schema_js_1.remoteSyncStates)
                .set({
                localHeadSha: params.localHeadSha,
                remoteHeadSha: params.remoteHeadSha,
                syncStatus: params.syncStatus,
                lastSyncedAt: now
            })
                .where((0, drizzle_orm_1.eq)(schema_js_1.remoteSyncStates.id, existing.id))
                .run();
            return {
                id: existing.id,
                projectId: params.projectId,
                branchName: params.branchName,
                localHeadSha: params.localHeadSha,
                remoteHeadSha: params.remoteHeadSha,
                syncStatus: params.syncStatus,
                lastSyncedAt: now
            };
        }
        const id = node_crypto_1.default.randomUUID();
        const record = {
            id,
            projectId: params.projectId,
            branchName: params.branchName,
            localHeadSha: params.localHeadSha,
            remoteHeadSha: params.remoteHeadSha,
            syncStatus: params.syncStatus,
            lastSyncedAt: now
        };
        this.db.insert(schema_js_1.remoteSyncStates).values(record).run();
        return {
            id,
            projectId: params.projectId,
            branchName: params.branchName,
            localHeadSha: params.localHeadSha,
            remoteHeadSha: params.remoteHeadSha,
            syncStatus: params.syncStatus,
            lastSyncedAt: now
        };
    }
    getState(projectId, branchName) {
        const row = this.db
            .select()
            .from(schema_js_1.remoteSyncStates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.remoteSyncStates.projectId, projectId), (0, drizzle_orm_1.eq)(schema_js_1.remoteSyncStates.branchName, branchName)))
            .get();
        if (!row)
            return null;
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
    listByProject(projectId) {
        const rows = this.db
            .select()
            .from(schema_js_1.remoteSyncStates)
            .where((0, drizzle_orm_1.eq)(schema_js_1.remoteSyncStates.projectId, projectId))
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
exports.RemoteSyncStateRepository = RemoteSyncStateRepository;
//# sourceMappingURL=remote-sync-state-repository.js.map