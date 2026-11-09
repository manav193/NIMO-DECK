import { z } from 'zod';

export const IPCRequestSchema = z.object({
  id: z.string().uuid(),
  channel: z.string().min(1),
  payload: z.unknown(),
  timestamp: z.number().int().positive()
});
export type IPCRequest<T = unknown> = {
  id: string;
  channel: string;
  payload: T;
  timestamp: number;
};

export const IPCErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional()
});
export type IPCError = z.infer<typeof IPCErrorSchema>;

export const IPCResponseSchema = z.object({
  id: z.string().uuid(),
  success: z.boolean(),
  data: z.unknown().optional(),
  error: IPCErrorSchema.optional(),
  durationMs: z.number().nonnegative()
});
export type IPCResponse<T = unknown> = {
  id: string;
  success: boolean;
  data?: T;
  error?: IPCError;
  durationMs: number;
};

export const IPCChannels = {
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
} as const;

export type IPCChannelName = typeof IPCChannels[keyof typeof IPCChannels];
