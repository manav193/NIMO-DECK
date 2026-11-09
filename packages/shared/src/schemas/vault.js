"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultSnapshotSchema = exports.AuditLogEntrySchema = exports.AuditActorSchema = void 0;
const zod_1 = require("zod");
exports.AuditActorSchema = zod_1.z.enum(['SYSTEM', 'USER', 'AI_AGENT']);
exports.AuditLogEntrySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    projectId: zod_1.z.string().uuid().nullable(),
    actor: exports.AuditActorSchema,
    action: zod_1.z.string().min(1),
    payloadHash: zod_1.z.string().length(64),
    prevLogHash: zod_1.z.string().length(64),
    entryHash: zod_1.z.string().length(64),
    createdAt: zod_1.z.date()
});
exports.VaultSnapshotSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    projectId: zod_1.z.string().uuid(),
    commitSha: zod_1.z.string().length(40).optional(),
    patchData: zod_1.z.string(), // Unified diff representation of uncommitted state
    description: zod_1.z.string(),
    createdAt: zod_1.z.date()
});
//# sourceMappingURL=vault.js.map