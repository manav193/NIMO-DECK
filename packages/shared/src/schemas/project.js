"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateProjectInputSchema = exports.CreateProjectInputSchema = exports.ProjectSchema = exports.ProjectStatusSchema = void 0;
const zod_1 = require("zod");
exports.ProjectStatusSchema = zod_1.z.enum(['ACTIVE', 'PAUSED', 'ERROR']);
exports.ProjectSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(255),
    localPath: zod_1.z.string().min(1),
    gitRemoteUrl: zod_1.z.string().url().nullable().optional(),
    status: exports.ProjectStatusSchema.default('ACTIVE'),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
exports.CreateProjectInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    localPath: zod_1.z.string().min(1),
    gitRemoteUrl: zod_1.z.string().url().optional()
});
exports.UpdateProjectInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    gitRemoteUrl: zod_1.z.string().url().nullable().optional(),
    status: exports.ProjectStatusSchema.optional()
});
//# sourceMappingURL=project.js.map