"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncConfigRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_js_1 = require("../database/schema.js");
class SyncConfigRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    getByProjectId(projectId) {
        const row = this.db
            .select()
            .from(schema_js_1.syncConfigs)
            .where((0, drizzle_orm_1.eq)(schema_js_1.syncConfigs.projectId, projectId))
            .get();
        if (!row)
            return null;
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
    update(projectId, input) {
        const now = new Date();
        const updateValues = {
            updatedAt: now
        };
        if (input.autoCommitEnabled !== undefined)
            updateValues.autoCommitEnabled = input.autoCommitEnabled;
        if (input.debounceWindowMs !== undefined)
            updateValues.debounceWindowMs = input.debounceWindowMs;
        if (input.maxWaitMs !== undefined)
            updateValues.maxWaitMs = input.maxWaitMs;
        if (input.autoPushMode !== undefined)
            updateValues.autoPushMode = input.autoPushMode;
        if (input.pushIntervalSec !== undefined)
            updateValues.pushIntervalSec = input.pushIntervalSec;
        if (input.aiCommitMessages !== undefined)
            updateValues.aiCommitMessages = input.aiCommitMessages;
        if (input.dryRunMode !== undefined)
            updateValues.dryRunMode = input.dryRunMode;
        this.db
            .update(schema_js_1.syncConfigs)
            .set(updateValues)
            .where((0, drizzle_orm_1.eq)(schema_js_1.syncConfigs.projectId, projectId))
            .run();
        return this.getByProjectId(projectId);
    }
}
exports.SyncConfigRepository = SyncConfigRepository;
//# sourceMappingURL=sync-config-repository.js.map