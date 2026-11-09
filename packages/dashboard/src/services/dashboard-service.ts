import type { IDashboardTransport } from './transport.js';
import { IPCChannels } from '@nimo-deck/shared';
import type {
  OverviewStats,
  Project,
  RemoteSyncState,
  DriveBackup,
  AIAnalysis,
  AIRecommendation,
  AIRoadmap,
  ProjectMemory,
  CrossProjectInsight,
  TimelineEvent,
  VaultSnapshot,
  RestorePreview,
  ChangelogRecord,
  UserSettings,
  NotificationItem,
  RecommendationStatus
} from '@nimo-deck/shared';

export interface GitHubStatusInfo {
  connected: boolean;
  username?: string;
  reposCount: number;
  rateLimitRemaining?: number;
  rateLimitTotal?: number;
}

export interface DriveStatusInfo {
  connected: boolean;
  email?: string;
  backupsCount: number;
  storageUsedBytes?: number;
  storageTotalBytes?: number;
}

export interface CredentialStatusInfo {
  githubConfigured: boolean;
  googleDriveConfigured: boolean;
  aiProviders: Array<{ provider: string; configured: boolean }>;
}

export class DashboardService {
  constructor(private transport: IDashboardTransport) {}

  getTransport(): IDashboardTransport {
    return this.transport;
  }

  isAvailable(): boolean {
    return this.transport.isAvailable();
  }

  // === OVERVIEW & SYSTEM ===
  async getOverviewStats(): Promise<OverviewStats> {
    return this.transport.invoke<undefined, OverviewStats>(IPCChannels.SYSTEM_GET_OVERVIEW);
  }

  // === PROJECTS ===
  async listProjects(): Promise<Project[]> {
    return this.transport.invoke<undefined, Project[]>(IPCChannels.PROJECT_LIST);
  }

  async getProject(id: string): Promise<Project | null> {
    return this.transport.invoke<{ id: string }, Project | null>(IPCChannels.PROJECT_GET, { id });
  }

  async createProject(data: { name: string; localPath: string; gitRemoteUrl?: string }): Promise<Project> {
    return this.transport.invoke<typeof data, Project>(IPCChannels.PROJECT_CREATE, data);
  }

  // === SYNC & GIT ===
  async getSyncStatus(projectId: string): Promise<RemoteSyncState | null> {
    return this.transport.invoke<{ projectId: string }, RemoteSyncState | null>(
      IPCChannels.SYNC_GET_STATUS,
      { projectId }
    );
  }

  async triggerCommit(projectId: string, message?: string): Promise<{ commitSha: string }> {
    return this.transport.invoke<{ projectId: string; message?: string }, { commitSha: string }>(
      IPCChannels.SYNC_TRIGGER_COMMIT,
      { projectId, message }
    );
  }

  async triggerPush(projectId: string): Promise<void> {
    return this.transport.invoke<{ projectId: string }, void>(IPCChannels.SYNC_TRIGGER_PUSH, {
      projectId
    });
  }

  async triggerPull(projectId: string): Promise<void> {
    return this.transport.invoke<{ projectId: string }, void>(IPCChannels.SYNC_TRIGGER_PULL, {
      projectId
    });
  }

  // === GITHUB ===
  async getGitHubStatus(): Promise<GitHubStatusInfo> {
    return this.transport.invoke<undefined, GitHubStatusInfo>(IPCChannels.GITHUB_GET_STATUS);
  }

  async listGitHubRepos(): Promise<Array<{ name: string; owner: string; isPrivate: boolean; mappedProjectId: string | null }>> {
    return this.transport.invoke<undefined, Array<{ name: string; owner: string; isPrivate: boolean; mappedProjectId: string | null }>>(
      IPCChannels.GITHUB_LIST_REPOS
    );
  }

  // === DRIVE & BACKUPS ===
  async getDriveStatus(): Promise<DriveStatusInfo> {
    return this.transport.invoke<undefined, DriveStatusInfo>(IPCChannels.DRIVE_GET_STATUS);
  }

  async listDriveBackups(projectId?: string): Promise<DriveBackup[]> {
    return this.transport.invoke<{ projectId?: string }, DriveBackup[]>(
      IPCChannels.DRIVE_LIST_BACKUPS,
      { projectId }
    );
  }

  async createDriveSnapshot(projectId: string): Promise<DriveBackup> {
    return this.transport.invoke<{ projectId: string }, DriveBackup>(
      IPCChannels.DRIVE_CREATE_SNAPSHOT,
      { projectId }
    );
  }

  // === INTELLIGENCE ===
  async analyzeProject(projectId: string): Promise<AIAnalysis> {
    return this.transport.invoke<{ projectId: string }, AIAnalysis>(
      IPCChannels.AI_ANALYZE_REPO,
      { projectId }
    );
  }

  async getRecommendations(projectId: string): Promise<AIRecommendation[]> {
    return this.transport.invoke<{ projectId: string }, AIRecommendation[]>(
      IPCChannels.AI_GET_RECOMMENDATIONS,
      { projectId }
    );
  }

  async updateRecommendationStatus(id: string, status: RecommendationStatus): Promise<void> {
    return this.transport.invoke<{ id: string; status: RecommendationStatus }, void>(
      IPCChannels.AI_UPDATE_RECOMMENDATION,
      { id, status }
    );
  }

  async getRoadmap(projectId: string): Promise<AIRoadmap | null> {
    return this.transport.invoke<{ projectId: string }, AIRoadmap | null>(
      IPCChannels.AI_GET_ROADMAP,
      { projectId }
    );
  }

  async getProjectMemory(projectId: string): Promise<ProjectMemory | null> {
    return this.transport.invoke<{ projectId: string }, ProjectMemory | null>(
      IPCChannels.AI_GET_MEMORY,
      { projectId }
    );
  }

  async getCrossProjectInsights(): Promise<CrossProjectInsight[]> {
    return this.transport.invoke<undefined, CrossProjectInsight[]>(
      IPCChannels.AI_GET_CROSS_PROJECT
    );
  }

  // === TIMELINE ===
  async getTimeline(projectId: string, search?: string): Promise<TimelineEvent[]> {
    return this.transport.invoke<{ projectId: string; search?: string }, TimelineEvent[]>(
      IPCChannels.TIMELINE_GET,
      { projectId, search }
    );
  }

  // === VAULT & AUDIT ===
  async listVaultSnapshots(projectId: string): Promise<VaultSnapshot[]> {
    return this.transport.invoke<{ projectId: string }, VaultSnapshot[]>(
      IPCChannels.VAULT_LIST_SNAPSHOTS,
      { projectId }
    );
  }

  async verifyAuditChain(projectId?: string): Promise<{ isValid: boolean; totalVerified: number; tamperEvidentGuarantee: string }> {
    return this.transport.invoke<{ projectId?: string }, { isValid: boolean; totalVerified: number; tamperEvidentGuarantee: string }>(
      IPCChannels.VAULT_VERIFY_CHAIN,
      { projectId }
    );
  }

  async getRestorePreview(snapshotId: string, projectPath: string): Promise<RestorePreview> {
    return this.transport.invoke<{ snapshotId: string; projectPath: string }, RestorePreview>(
      IPCChannels.VAULT_RESTORE_PREVIEW,
      { snapshotId, projectPath }
    );
  }

  async generateChangelog(data: { projectId: string; version: string; title: string }): Promise<ChangelogRecord> {
    return this.transport.invoke<typeof data, ChangelogRecord>(
      IPCChannels.VAULT_GENERATE_CHANGELOG,
      data
    );
  }

  // === SETTINGS & CREDENTIALS ===
  async getSettings(): Promise<UserSettings> {
    return this.transport.invoke<undefined, UserSettings>(IPCChannels.SETTINGS_GET);
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return this.transport.invoke<Partial<UserSettings>, UserSettings>(
      IPCChannels.SETTINGS_UPDATE,
      settings
    );
  }

  async getCredentialStatus(): Promise<CredentialStatusInfo> {
    return this.transport.invoke<undefined, CredentialStatusInfo>(
      IPCChannels.SETTINGS_GET_CREDENTIAL_STATUS
    );
  }

  // === ONBOARDING ===
  async discoverProjects(): Promise<Array<{ path: string; name: string; isGitRepo: boolean; selected: boolean }>> {
    return this.transport.invoke<undefined, Array<{ path: string; name: string; isGitRepo: boolean; selected: boolean }>>(
      IPCChannels.ONBOARDING_DISCOVER_PROJECTS
    );
  }

  // === NOTIFICATIONS ===
  async getNotifications(): Promise<NotificationItem[]> {
    return this.transport.invoke<undefined, NotificationItem[]>('notifications:list');
  }

  async markNotificationRead(id: string): Promise<void> {
    return this.transport.invoke<{ id: string }, void>('notifications:markRead', { id });
  }

  // === SUBSCRIPTIONS ===
  onSyncStateChanged(handler: (data: unknown) => void): () => void {
    return this.transport.subscribe(IPCChannels.EVENT_SYNC_STATE_CHANGED, handler);
  }

  onAlertRaised(handler: (data: unknown) => void): () => void {
    return this.transport.subscribe(IPCChannels.EVENT_ALERT_RAISED, handler);
  }
}
