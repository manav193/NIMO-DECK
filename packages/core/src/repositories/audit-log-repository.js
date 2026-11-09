"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogRepository = exports.GENESIS_HASH = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_js_1 = require("../database/schema.js");
const shared_1 = require("@nimo-deck/shared");
const node_crypto_1 = __importDefault(require("node:crypto"));
exports.GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
class AuditLogRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    getLatestEntry() {
        const row = this.db
            .select()
            .from(schema_js_1.auditLogs)
            .orderBy((0, drizzle_orm_1.desc)(schema_js_1.auditLogs.createdAt))
            .limit(1)
            .get();
        if (!row)
            return null;
        return {
            id: row.id,
            projectId: row.projectId,
            actor: row.actor,
            action: row.action,
            payloadHash: row.payloadHash,
            prevLogHash: row.prevLogHash,
            entryHash: row.entryHash,
            createdAt: row.createdAt
        };
    }
    appendLog(params) {
        const latest = this.getLatestEntry();
        const prevLogHash = latest ? latest.entryHash : exports.GENESIS_HASH;
        const id = node_crypto_1.default.randomUUID();
        const now = new Date();
        const payloadHash = (0, shared_1.hashPayload)(params.payload);
        const entryHash = (0, shared_1.computeAuditChainHash)({
            prevLogHash,
            id,
            actor: params.actor,
            action: params.action,
            payloadHash,
            createdAt: now.getTime()
        });
        const record = {
            id,
            projectId: params.projectId || null,
            actor: params.actor,
            action: params.action,
            payloadHash,
            prevLogHash,
            entryHash,
            createdAt: now
        };
        this.db.insert(schema_js_1.auditLogs).values(record).run();
        return {
            id,
            projectId: params.projectId || null,
            actor: params.actor,
            action: params.action,
            payloadHash,
            prevLogHash,
            entryHash,
            createdAt: now
        };
    }
    listLogs(projectId, limit = 100) {
        const query = projectId
            ? this.db.select().from(schema_js_1.auditLogs).where((0, drizzle_orm_1.eq)(schema_js_1.auditLogs.projectId, projectId))
            : this.db.select().from(schema_js_1.auditLogs);
        const rows = query.orderBy((0, drizzle_orm_1.desc)(schema_js_1.auditLogs.createdAt)).limit(limit).all();
        return rows.map((row) => ({
            id: row.id,
            projectId: row.projectId,
            actor: row.actor,
            action: row.action,
            payloadHash: row.payloadHash,
            prevLogHash: row.prevLogHash,
            entryHash: row.entryHash,
            createdAt: row.createdAt
        }));
    }
    /**
     * Verifies the cryptographic integrity of the entire audit chain from genesis to head.
     */
    verifyChainIntegrity() {
        const rows = this.db.select().from(schema_js_1.auditLogs).orderBy((0, drizzle_orm_1.asc)(schema_js_1.auditLogs.createdAt)).all();
        let expectedPrevHash = exports.GENESIS_HASH;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            // 1. Verify link to previous entry
            if (row.prevLogHash !== expectedPrevHash) {
                return {
                    isValid: false,
                    totalVerified: i,
                    tamperedEntryId: row.id,
                    tamperedIndex: i,
                    reason: `Previous hash mismatch: expected ${expectedPrevHash}, found ${row.prevLogHash}`
                };
            }
            // 2. Recompute entry hash
            const recomputedHash = (0, shared_1.computeAuditChainHash)({
                prevLogHash: row.prevLogHash,
                id: row.id,
                actor: row.actor,
                action: row.action,
                payloadHash: row.payloadHash,
                createdAt: row.createdAt.getTime()
            });
            if (recomputedHash !== row.entryHash) {
                return {
                    isValid: false,
                    totalVerified: i,
                    tamperedEntryId: row.id,
                    tamperedIndex: i,
                    reason: `Entry hash corrupted: recomputed ${recomputedHash}, stored ${row.entryHash}`
                };
            }
            expectedPrevHash = row.entryHash;
        }
        return {
            isValid: true,
            totalVerified: rows.length
        };
    }
}
exports.AuditLogRepository = AuditLogRepository;
//# sourceMappingURL=audit-log-repository.js.map