import { z } from 'zod';
export declare const DriveBackupTypeSchema: z.ZodEnum<["SNAPSHOT", "DOCS_MIRROR"]>;
export type DriveBackupType = z.infer<typeof DriveBackupTypeSchema>;
export declare const DriveBackupStatusSchema: z.ZodEnum<["PENDING", "COMPLETED", "FAILED"]>;
export type DriveBackupStatus = z.infer<typeof DriveBackupStatusSchema>;
export declare const DriveBackupSchema: z.ZodObject<{
    id: z.ZodString;
    projectId: z.ZodString;
    driveFileId: z.ZodString;
    driveFolderId: z.ZodString;
    snapshotSha256: z.ZodString;
    sizeBytes: z.ZodNumber;
    backupType: z.ZodEnum<["SNAPSHOT", "DOCS_MIRROR"]>;
    status: z.ZodEnum<["PENDING", "COMPLETED", "FAILED"]>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "PENDING" | "FAILED" | "COMPLETED";
    createdAt: Date;
    projectId: string;
    driveFileId: string;
    driveFolderId: string;
    snapshotSha256: string;
    sizeBytes: number;
    backupType: "SNAPSHOT" | "DOCS_MIRROR";
}, {
    id: string;
    status: "PENDING" | "FAILED" | "COMPLETED";
    createdAt: Date;
    projectId: string;
    driveFileId: string;
    driveFolderId: string;
    snapshotSha256: string;
    sizeBytes: number;
    backupType: "SNAPSHOT" | "DOCS_MIRROR";
}>;
export type DriveBackup = z.infer<typeof DriveBackupSchema>;
export declare const SnapshotManifestSchema: z.ZodObject<{
    version: z.ZodLiteral<"1.0">;
    projectId: z.ZodString;
    projectName: z.ZodString;
    snapshotTimestamp: z.ZodString;
    gitCommitSha: z.ZodOptional<z.ZodString>;
    fileCount: z.ZodNumber;
    totalSizeBytes: z.ZodNumber;
    manifestSha256: z.ZodString;
    syncToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    projectId: string;
    version: "1.0";
    projectName: string;
    snapshotTimestamp: string;
    fileCount: number;
    totalSizeBytes: number;
    manifestSha256: string;
    syncToken: string;
    gitCommitSha?: string | undefined;
}, {
    projectId: string;
    version: "1.0";
    projectName: string;
    snapshotTimestamp: string;
    fileCount: number;
    totalSizeBytes: number;
    manifestSha256: string;
    syncToken: string;
    gitCommitSha?: string | undefined;
}>;
export type SnapshotManifest = z.infer<typeof SnapshotManifestSchema>;
//# sourceMappingURL=drive.d.ts.map