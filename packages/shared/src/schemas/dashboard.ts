import { z } from 'zod';

export const OverviewStatsSchema = z.object({
  totalProjects: z.number().int().nonnegative(),
  activeProjects: z.number().int().nonnegative(),
  inSyncCount: z.number().int().nonnegative(),
  aheadCount: z.number().int().nonnegative(),
  behindCount: z.number().int().nonnegative(),
  divergedCount: z.number().int().nonnegative(),
  githubConnected: z.boolean(),
  driveConnected: z.boolean(),
  recentCommitsCount: z.number().int().nonnegative(),
  recentSnapshotsCount: z.number().int().nonnegative(),
  systemHealth: z.enum(['HEALTHY', 'DEGRADED', 'OFFLINE']),
  pendingOperations: z.number().int().nonnegative()
});
export type OverviewStats = z.infer<typeof OverviewStatsSchema>;

export const NotificationTypeSchema = z.enum([
  'COMMIT',
  'PUSH',
  'SYNC_CONFLICT',
  'BACKUP',
  'BACKUP_FAILED',
  'AI_ANALYSIS',
  'SECURITY',
  'RECOVERY'
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationItemSchema = z.object({
  id: z.string().uuid(),
  type: NotificationTypeSchema,
  title: z.string().min(1),
  message: z.string(),
  timestamp: z.coerce.date(),
  read: z.boolean().default(false),
  projectId: z.string().optional()
});
export type NotificationItem = z.infer<typeof NotificationItemSchema>;

export const UserSettingsSchema = z.object({
  githubUsername: z.string().optional(),
  googleAccountEmail: z.string().optional(),
  aiProvider: z.string().default('openrouter'),
  aiModel: z.string().default('anthropic/claude-3.5-sonnet'),
  autoSyncDefault: z.boolean().default(true),
  debounceWindowMs: z.number().int().positive().default(5000),
  allowCloudAI: z.boolean().default(true),
  localOnlyInference: z.boolean().default(false),
  theme: z.enum(['dark', 'light', 'system']).default('dark')
});
export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const OnboardingStateSchema = z.object({
  step: z.number().int().min(1).max(7),
  completed: z.boolean().default(false),
  discoveredProjects: z.array(
    z.object({
      path: z.string(),
      name: z.string(),
      isGitRepo: z.boolean(),
      selected: z.boolean()
    })
  ).default([]),
  githubConnected: z.boolean().default(false),
  driveConnected: z.boolean().default(false),
  aiProviderConfigured: z.boolean().default(false),
  autoSyncEnabled: z.boolean().default(true)
});
export type OnboardingState = z.infer<typeof OnboardingStateSchema>;
