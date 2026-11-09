import { z } from 'zod';

export const AuditActorSchema = z.enum(['SYSTEM', 'USER', 'AI_AGENT']);
export type AuditActor = z.infer<typeof AuditActorSchema>;

export const AuditLogEntrySchema = z.object({
  id: z.string().uuid(),
  sequenceNum: z.number().int().nonnegative().optional(),
  projectId: z.string().uuid().nullable(),
  actor: AuditActorSchema,
  action: z.string().min(1),
  payloadHash: z.string().length(64),
  prevLogHash: z.string().length(64),
  entryHash: z.string().length(64),
  createdAt: z.date()
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

export const SnapshotTypeSchema = z.enum([
  'FULL',
  'INCREMENTAL',
  'DIFFERENTIAL',
  'SAFETY_PRE_RESTORE'
]);
export type SnapshotType = z.infer<typeof SnapshotTypeSchema>;

export const SnapshotFileStateSchema = z.enum([
  'COMMITTED',
  'STAGED',
  'UNSTAGED',
  'UNTRACKED',
  'DELETED'
]);
export type SnapshotFileState = z.infer<typeof SnapshotFileStateSchema>;

export const SnapshotFileEntrySchema = z.object({
  path: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().length(64),
  state: SnapshotFileStateSchema
});
export type SnapshotFileEntry = z.infer<typeof SnapshotFileEntrySchema>;

export const VaultSnapshotManifestSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  snapshotType: SnapshotTypeSchema,
  parentSnapshotId: z.string().uuid().optional(),
  commitSha: z.string().length(40).optional(),
  branch: z.string().optional(),
  rootHash: z.string().length(64),
  files: z.array(SnapshotFileEntrySchema),
  stagedPatch: z.string().optional(),
  unstagedPatch: z.string().optional(),
  description: z.string(),
  createdAt: z.date()
});
export type VaultSnapshotManifest = z.infer<typeof VaultSnapshotManifestSchema>;

export const VaultSnapshotSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  commitSha: z.string().length(40).optional(),
  patchData: z.string(), // Unified diff representation of uncommitted state
  description: z.string(),
  snapshotType: SnapshotTypeSchema.default('FULL'),
  parentSnapshotId: z.string().uuid().optional(),
  rootHash: z.string().length(64).optional(),
  manifestJson: z.string().optional(),
  fileCount: z.number().int().nonnegative().default(0),
  sizeBytes: z.number().int().nonnegative().default(0),
  isPinned: z.boolean().default(false),
  createdAt: z.date()
});
export type VaultSnapshot = z.infer<typeof VaultSnapshotSchema>;

export const RestorePreviewSchema = z.object({
  snapshotId: z.string().uuid(),
  targetPath: z.string().min(1),
  filesToCreate: z.array(z.string()),
  filesToOverwrite: z.array(z.string()),
  filesToDelete: z.array(z.string()),
  filesUnchanged: z.array(z.string()),
  isWorkingTreeDirty: z.boolean(),
  requiresConfirmation: z.boolean()
});
export type RestorePreview = z.infer<typeof RestorePreviewSchema>;

export const TimelineEventTypeSchema = z.enum([
  'GIT_COMMIT',
  'SYNC_CYCLE',
  'DRIVE_BACKUP',
  'DRIVE_RESTORE',
  'AI_ANALYSIS',
  'VAULT_SNAPSHOT',
  'VAULT_RESTORE',
  'USER_ACTION'
]);
export type TimelineEventType = z.infer<typeof TimelineEventTypeSchema>;

export const TimelineEventSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  timestamp: z.date(),
  type: TimelineEventTypeSchema,
  title: z.string().min(1),
  description: z.string(),
  actor: z.string(),
  commitSha: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export const ChangelogRecordSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  version: z.string().min(1),
  title: z.string().min(1),
  markdown: z.string().min(1),
  commitRange: z.string().optional(),
  features: z.array(z.string()),
  fixes: z.array(z.string()),
  breakingChanges: z.array(z.string()),
  aiNarrative: z.string().optional(),
  generatedAt: z.date()
});
export type ChangelogRecord = z.infer<typeof ChangelogRecordSchema>;
