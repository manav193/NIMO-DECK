import { z } from 'zod';

export const AuditActorSchema = z.enum(['SYSTEM', 'USER', 'AI_AGENT']);
export type AuditActor = z.infer<typeof AuditActorSchema>;

export const AuditLogEntrySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  actor: AuditActorSchema,
  action: z.string().min(1),
  payloadHash: z.string().length(64),
  prevLogHash: z.string().length(64),
  entryHash: z.string().length(64),
  createdAt: z.date()
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

export const VaultSnapshotSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  commitSha: z.string().length(40).optional(),
  patchData: z.string(), // Unified diff representation of uncommitted state
  description: z.string(),
  createdAt: z.date()
});
export type VaultSnapshot = z.infer<typeof VaultSnapshotSchema>;
