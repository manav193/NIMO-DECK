"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncEventRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_js_1 = require("../database/schema.js");
const node_crypto_1 = __importDefault(require("node:crypto"));
class SyncEventRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    logEvent(params) {
        const id = node_crypto_1.default.randomUUID();
        const now = params.createdAt || new Date();
        const record = {
            id,
            projectId: params.projectId,
            eventType: String(params.eventType),
            status: params.status,
            detailsJson: JSON.stringify(params.details),
            createdAt: now
        };
        this.db.insert(schema_js_1.syncEvents).values(record).run();
        return {
            id,
            projectId: params.projectId,
            eventType: String(params.eventType),
            status: params.status,
            details: params.details,
            createdAt: now
        };
    }
    listByProject(projectId, limit = 50) {
        const rows = this.db
            .select()
            .from(schema_js_1.syncEvents)
            .where((0, drizzle_orm_1.eq)(schema_js_1.syncEvents.projectId, projectId))
            .orderBy((0, drizzle_orm_1.desc)(schema_js_1.syncEvents.createdAt))
            .limit(limit)
            .all();
        return rows.map((row) => ({
            id: row.id,
            projectId: row.projectId,
            eventType: row.eventType,
            status: row.status,
            details: JSON.parse(row.detailsJson),
            createdAt: row.createdAt
        }));
    }
}
exports.SyncEventRepository = SyncEventRepository;
//# sourceMappingURL=sync-event-repository.js.map