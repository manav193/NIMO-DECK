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
  // System & Health
  SYSTEM_GET_OVERVIEW: 'system:getOverview',
  SYSTEM_HEALTH: 'system:health',

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

  // GitHub integration
  GITHUB_GET_STATUS: 'github:getStatus',
  GITHUB_LIST_REPOS: 'github:listRepos',
  GITHUB_MAP_REPO: 'github:mapRepo',
  GITHUB_GET_INVENTORY: 'github:getInventory',

  // Drive & Backups
  DRIVE_GET_STATUS: 'drive:getStatus',
  DRIVE_CREATE_SNAPSHOT: 'drive:createSnapshot',
  DRIVE_LIST_BACKUPS: 'drive:listBackups',
  DRIVE_RESTORE: 'drive:restore',
  DRIVE_GET_STORAGE_USAGE: 'drive:getStorageUsage',

  // AI Intelligence
  AI_ANALYZE_REPO: 'ai:analyzeRepo',
  AI_GET_RECOMMENDATIONS: 'ai:getRecommendations',
  AI_UPDATE_RECOMMENDATION: 'ai:updateRecommendation',
  AI_GET_ROADMAP: 'ai:getRoadmap',
  AI_GET_MEMORY: 'ai:getMemory',
  AI_GET_CROSS_PROJECT: 'ai:getCrossProject',
  AI_CONVERT_ISSUE: 'ai:convertIssue',

  // Timeline
  TIMELINE_GET: 'timeline:get',

  // Vault & Recovery
  VAULT_LIST_SNAPSHOTS: 'vault:listSnapshots',
  VAULT_COMPARE_SNAPSHOTS: 'vault:compareSnapshots',
  VAULT_RESTORE_PREVIEW: 'vault:restorePreview',
  VAULT_RESTORE_EXECUTE: 'vault:restoreExecute',
  VAULT_GENERATE_CHANGELOG: 'vault:generateChangelog',
  VAULT_LIST_AUDIT_LOGS: 'vault:listAuditLogs',
  VAULT_VERIFY_CHAIN: 'vault:verifyChain',
  VAULT_APPLY_RETENTION: 'vault:applyRetention',

  // Settings & Credentials
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_GET_CREDENTIAL_STATUS: 'settings:getCredentialStatus',

  // Onboarding
  ONBOARDING_DISCOVER_PROJECTS: 'onboarding:discoverProjects',
  ONBOARDING_COMPLETE: 'onboarding:complete',

  // Workspace Discovery
  WORKSPACE_SCAN: 'workspace:scan',
  WORKSPACE_IMPORT_BATCH: 'workspace:importBatch',

  // Device & Multi-Device Federation
  DEVICE_GET_CURRENT: 'device:getCurrent',
  DEVICE_LIST_REGISTERED: 'device:listRegistered',
  DEVICE_PAIR_REQUEST: 'device:pairRequest',
  DEVICE_REVOKE: 'device:revoke',
  DEVICE_SYNC_CLOUD: 'device:syncCloud',

  // App Lifecycle & Updates
  APP_CHECK_UPDATES: 'app:checkUpdates',
  APP_GET_LOGS: 'app:getLogs',
  APP_RESTART: 'app:restart',

  // Push notifications / events from Main to Renderer
  EVENT_SYNC_STATE_CHANGED: 'event:syncStateChanged',
  EVENT_ALERT_RAISED: 'event:alertRaised',
  EVENT_NOTIFICATION: 'event:notification'
} as const;

export type IPCChannelName = typeof IPCChannels[keyof typeof IPCChannels];
