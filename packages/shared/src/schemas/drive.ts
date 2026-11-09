import { z } from 'zod';

export const DriveBackupTypeSchema = z.enum(['SNAPSHOT', 'DOCS_MIRROR']);
export type DriveBackupType = z.infer<typeof DriveBackupTypeSchema>;

export const DriveBackupStatusSchema = z.enum(['PENDING', 'COMPLETED', 'FAILED']);
export type DriveBackupStatus = z.infer<typeof DriveBackupStatusSchema>;

export const DriveBackupSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  driveFileId: z.string().min(1),
  driveFolderId: z.string().min(1),
  snapshotSha256: z.string().length(64),
  sizeBytes: z.number().int().nonnegative(),
  backupType: DriveBackupTypeSchema,
  status: DriveBackupStatusSchema,
  createdAt: z.date()
});
export type DriveBackup = z.infer<typeof DriveBackupSchema>;

export const SnapshotManifestSchema = z.object({
  version: z.literal('1.0'),
  projectId: z.string().uuid(),
  projectName: z.string(),
  snapshotTimestamp: z.string().datetime(),
  gitCommitSha: z.string().length(40).optional(),
  fileCount: z.number().int().nonnegative(),
  totalSizeBytes: z.number().int().nonnegative(),
  manifestSha256: z.string().length(64),
  syncToken: z.string().uuid() // Used by DECK SYNC to prevent synchronization loops
});
export type SnapshotManifest = z.infer<typeof SnapshotManifestSchema>;
