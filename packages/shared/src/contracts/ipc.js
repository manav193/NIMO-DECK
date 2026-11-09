"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPCChannels = exports.IPCResponseSchema = exports.IPCErrorSchema = exports.IPCRequestSchema = void 0;
const zod_1 = require("zod");
exports.IPCRequestSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    channel: zod_1.z.string().min(1),
    payload: zod_1.z.unknown(),
    timestamp: zod_1.z.number().int().positive()
});
exports.IPCErrorSchema = zod_1.z.object({
    code: zod_1.z.string(),
    message: zod_1.z.string(),
    details: zod_1.z.unknown().optional()
});
exports.IPCResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    success: zod_1.z.boolean(),
    data: zod_1.z.unknown().optional(),
    error: exports.IPCErrorSchema.optional(),
    durationMs: zod_1.z.number().nonnegative()
});
exports.IPCChannels = {
    // Project management
    PROJECT_LIST: 'project:list',
    PROJECT_GET: 'project:get',
    PROJECT_CREATE: 'project:create',
    PROJECT_UPDATE: 'project:update',
    PROJECT_DELETE: 'project:delete',
    // Sync operations
    SYNC_TRIGGER_COMMIT: 'sync:triggerCommit',
    SYNC_TRIGGER_PUSH: 'sync:triggerPush',
    SYNC_TRIGGER_PULL: 'sync:triggerPull',
    SYNC_GET_CONFIG: 'sync:getConfig',
    SYNC_UPDATE_CONFIG: 'sync:updateConfig',
    SYNC_GET_STATUS: 'sync:getStatus',
    // Drive & Backups
    DRIVE_CREATE_SNAPSHOT: 'drive:createSnapshot',
    DRIVE_LIST_BACKUPS: 'drive:listBackups',
    DRIVE_RESTORE: 'drive:restore',
    // AI Intelligence
    AI_ANALYZE_REPO: 'ai:analyzeRepo',
    AI_GET_RECOMMENDATIONS: 'ai:getRecommendations',
    AI_UPDATE_RECOMMENDATION: 'ai:updateRecommendation',
    AI_GET_ROADMAP: 'ai:getRoadmap',
    // Vault & Audit
    VAULT_LIST_AUDIT_LOGS: 'vault:listAuditLogs',
    VAULT_VERIFY_CHAIN: 'vault:verifyChain',
    // Push notifications / events from Main to Renderer
    EVENT_SYNC_STATE_CHANGED: 'event:syncStateChanged',
    EVENT_ALERT_RAISED: 'event:alertRaised'
};
//# sourceMappingURL=ipc.js.map