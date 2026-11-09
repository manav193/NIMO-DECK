"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnapshotManifestSchema = exports.DriveBackupSchema = exports.DriveBackupStatusSchema = exports.DriveBackupTypeSchema = void 0;
const zod_1 = require("zod");
exports.DriveBackupTypeSchema = zod_1.z.enum(['SNAPSHOT', 'DOCS_MIRROR']);
exports.DriveBackupStatusSchema = zod_1.z.enum(['PENDING', 'COMPLETED', 'FAILED']);
exports.DriveBackupSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    projectId: zod_1.z.string().uuid(),
    driveFileId: zod_1.z.string().min(1),
    driveFolderId: zod_1.z.string().min(1),
    snapshotSha256: zod_1.z.string().length(64),
    sizeBytes: zod_1.z.number().int().nonnegative(),
    backupType: exports.DriveBackupTypeSchema,
    status: exports.DriveBackupStatusSchema,
    createdAt: zod_1.z.date()
});
exports.SnapshotManifestSchema = zod_1.z.object({
    version: zod_1.z.literal('1.0'),
    projectId: zod_1.z.string().uuid(),
    projectName: zod_1.z.string(),
    snapshotTimestamp: zod_1.z.string().datetime(),
    gitCommitSha: zod_1.z.string().length(40).optional(),
    fileCount: zod_1.z.number().int().nonnegative(),
    totalSizeBytes: zod_1.z.number().int().nonnegative(),
    manifestSha256: zod_1.z.string().length(64),
    syncToken: zod_1.z.string().uuid() // Used by DECK SYNC to prevent synchronization loops
});
//# sourceMappingURL=drive.js.map