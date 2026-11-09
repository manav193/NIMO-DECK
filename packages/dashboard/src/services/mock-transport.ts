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
  NotificationItem
} from '@nimo-deck/shared';

export class MockDashboardTransport implements IDashboardTransport {
  isAvailable(): boolean {
    return true;
  }

  getTransportType(): 'mock' {
    return 'mock';
  }

  // Realistic development fixtures
  private mockProjects: Project[] = [
    {
      id: 'proj-1',
      name: 'NIMO-DECK Core',
      localPath: 'C:\\Users\\manav\\OneDrive\\NIMO-DECK',
      gitRemoteUrl: 'https://github.com/manav193/NIMO-DECK',
      status: 'ACTIVE',
      createdAt: new Date('2026-11-01T08:00:00Z'),
      updatedAt: new Date('2026-11-09T18:00:00Z')
    },
    {
      id: 'proj-2',
      name: 'Apollo Telemetry Engine',
      localPath: 'C:\\Projects\\Apollo-Telemetry',
      gitRemoteUrl: 'https://github.com/manav193/Apollo-Telemetry',
      status: 'ACTIVE',
      createdAt: new Date('2026-10-15T10:00:00Z'),
      updatedAt: new Date('2026-11-08T12:00:00Z')
    },
    {
      id: 'proj-3',
      name: 'Hermes Mesh Protocol',
      localPath: 'C:\\Projects\\Hermes-Mesh',
      gitRemoteUrl: null, // Local-only
      status: 'ACTIVE',
      createdAt: new Date('2026-11-05T14:00:00Z'),
      updatedAt: new Date('2026-11-09T16:30:00Z')
    }
  ];

  private mockSyncStates: Record<string, RemoteSyncState> = {
    'proj-1': {
      id: 'sync-1',
      projectId: 'proj-1',
      branchName: 'main',
      localHeadSha: '7e38a37f59d4c1b98a3e78f6a39d8e7c5b4a3f12',
      remoteHeadSha: '7e38a37f59d4c1b98a3e78f6a39d8e7c5b4a3f12',
      syncStatus: 'IN_SYNC',
      lastSyncedAt: new Date()
    },
    'proj-2': {
      id: 'sync-2',
      projectId: 'proj-2',
      branchName: 'develop',
      localHeadSha: 'a1b2c3d4e5f67890123456789012345678901234',
      remoteHeadSha: 'f6e5d4c3b2a10987654321098765432109876543',
      syncStatus: 'AHEAD',
      lastSyncedAt: new Date(Date.now() - 3600000)
    }
  };

  private mockUserSettings: UserSettings = {
    githubUsername: 'manav193',
    googleAccountEmail: 'manav.patel@example.com',
    aiProvider: 'openrouter',
    aiModel: 'anthropic/claude-3.5-sonnet',
    autoSyncDefault: true,
    debounceWindowMs: 5000,
    allowCloudAI: true,
    localOnlyInference: false,
    theme: 'dark'
  };

  private mockNotifications: NotificationItem[] = [
    {
      id: 'notif-1',
      type: 'COMMIT',
      title: 'Git Commit Created',
      message: 'feat(vault): implement Phase 6 DECK VAULT audit engine (7e38a37)',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      read: false,
      projectId: 'proj-1'
    },
    {
      id: 'notif-2',
      type: 'BACKUP',
      title: 'Google Drive Snapshot Verified',
      message: 'Encrypted snapshot archived to Google Drive (2.4 MB)',
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      read: false,
      projectId: 'proj-1'
    },
    {
      id: 'notif-3',
      type: 'AI_ANALYSIS',
      title: 'AI Codebase Intelligence Complete',
      message: 'Grounded cognitive analysis generated 4 recommendations',
      timestamp: new Date(Date.now() - 1000 * 60 * 180),
      read: true,
      projectId: 'proj-1'
    }
  ];

  async invoke<TRequest = unknown, TResponse = unknown>(
    channel: string,
    payload?: TRequest
  ): Promise<TResponse> {
    const p = payload as Record<string, unknown> | undefined;

    switch (channel) {
      case IPCChannels.SYSTEM_GET_OVERVIEW: {
        const stats: OverviewStats = {
          totalProjects: this.mockProjects.length,
          activeProjects: this.mockProjects.length,
          inSyncCount: 1,
          aheadCount: 1,
          behindCount: 0,
          divergedCount: 0,
          githubConnected: true,
          driveConnected: true,
          recentCommitsCount: 14,
          recentSnapshotsCount: 6,
          systemHealth: 'HEALTHY',
          pendingOperations: 0
        };
        return stats as TResponse;
      }

      case IPCChannels.PROJECT_LIST: {
        return [...this.mockProjects] as TResponse;
      }

      case IPCChannels.PROJECT_GET: {
        const id = p?.id as string;
        const found = this.mockProjects.find((x) => x.id === id) || null;
        return found as TResponse;
      }

      case IPCChannels.PROJECT_CREATE: {
        const newProj: Project = {
          id: `proj-${Date.now()}`,
          name: (p?.name as string) || 'New Project',
          localPath: (p?.localPath as string) || 'C:\\Projects\\NewProject',
          gitRemoteUrl: (p?.gitRemoteUrl as string) || null,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        this.mockProjects.push(newProj);
        return newProj as TResponse;
      }

      case IPCChannels.SYNC_GET_STATUS: {
        const id = (p?.projectId as string) || 'proj-1';
        return (this.mockSyncStates[id] || null) as TResponse;
      }

      case IPCChannels.SYNC_TRIGGER_COMMIT: {
        return { commitSha: '7e38a37f59d4c1b98a3e78f6a39d8e7c5b4a3f12' } as TResponse;
      }

      case IPCChannels.SYNC_TRIGGER_PUSH: {
        return { success: true } as TResponse;
      }

      case IPCChannels.SYNC_TRIGGER_PULL: {
        return { success: true } as TResponse;
      }

      case IPCChannels.GITHUB_GET_STATUS: {
        return {
          connected: true,
          username: 'manav193',
          reposCount: 8,
          rateLimitRemaining: 4920,
          rateLimitTotal: 5000
        } as TResponse;
      }

      case IPCChannels.GITHUB_LIST_REPOS: {
        return [
          { name: 'NIMO-DECK', owner: 'manav193', isPrivate: false, mappedProjectId: 'proj-1' },
          { name: 'Apollo-Telemetry', owner: 'manav193', isPrivate: true, mappedProjectId: 'proj-2' },
          { name: 'cloud-infra-specs', owner: 'manav193', isPrivate: true, mappedProjectId: null }
        ] as TResponse;
      }

      case IPCChannels.DRIVE_GET_STATUS: {
        return {
          connected: true,
          email: 'manav.patel@example.com',
          backupsCount: 12,
          storageUsedBytes: 245 * 1024 * 1024,
          storageTotalBytes: 15 * 1024 * 1024 * 1024
        } as TResponse;
      }

      case IPCChannels.DRIVE_LIST_BACKUPS: {
        const backups: DriveBackup[] = [
          {
            id: 'backup-1',
            projectId: 'proj-1',
            driveFileId: 'df-12345',
            driveFolderId: 'folder-abc',
            snapshotSha256: '7e38a37f59d4c1b98a3e78f6a39d8e7c5b4a3f127e38a37f59d4c1b98a3e78f6',
            sizeBytes: 2450000,
            backupType: 'SNAPSHOT',
            status: 'COMPLETED',
            createdAt: new Date(Date.now() - 3600000)
          }
        ];
        return backups as TResponse;
      }

      case IPCChannels.DRIVE_CREATE_SNAPSHOT: {
        const backup: DriveBackup = {
          id: `backup-${Date.now()}`,
          projectId: (p?.projectId as string) || 'proj-1',
          driveFileId: 'df-mock-new',
          driveFolderId: 'folder-abc',
          snapshotSha256: 'mock-sha-256-digest-value-here-00000000000000000000000000000000000000',
          sizeBytes: 2457600,
          backupType: 'SNAPSHOT',
          status: 'COMPLETED',
          createdAt: new Date()
        };
        return backup as TResponse;
      }

      case IPCChannels.AI_ANALYZE_REPO: {
        const analysis: AIAnalysis = {
          id: 'ai-mock-1',
          projectId: (p?.projectId as string) || 'proj-1',
          modelUsed: 'anthropic/claude-3.5-sonnet',
          commitSha: '7e38a37f59d4c1b98a3e78f6a39d8e7c5b4a3f12',
          promptVersion: 'v1.0',
          summaryMarkdown:
            'NIMO-DECK is architected as an offline-first Personal Development OS featuring clean monorepo boundary separation across 7 TypeScript packages.',
          techDebtReport: 'Zero circular dependencies identified. AST extraction confirms strong modularization.',
          securityReport: 'Secret scanning active; zero plaintext API keys or environmental secrets committed.',
          recommendations: [],
          tokenUsage: { promptTokens: 1240, completionTokens: 480, totalTokens: 1720, estimatedCostUsd: 0.0078 },
          createdAt: new Date()
        };
        return analysis as TResponse;
      }

      case IPCChannels.AI_GET_RECOMMENDATIONS: {
        const recs: AIRecommendation[] = [
          {
            id: 'rec-1',
            analysisId: 'ai-mock-1',
            projectId: 'proj-1',
            title: 'Implement Multi-Workspace Hot-Reload in Desktop Dashboard',
            category: 'VERIFIED_FACT',
            severity: 'MEDIUM',
            complexity: 'M',
            reasoning: 'Reduces state loss when switching between rapid repository tabs.',
            expectedBenefits: 'Improves developer productivity and avoids full redraw cycles.',
            dependencies: ['packages/dashboard/src/context/DashboardContext.tsx'],
            status: 'ACCEPTED',
            evidence: [
              {
                type: 'FILE',
                path: 'packages/dashboard/src/components/workspace/ProjectWorkspace.tsx',
                lineStart: 12,
                details: 'Workspace tab navigation component handles state resets.'
              }
            ],
            risks: ['Cache invalidation during background Git pulls.'],
            implementationSteps: ['Store active tab in local state'],
            acceptanceCriteria: ['Tabs preserve scroll state and uncommitted inputs.'],
            createdAt: new Date(Date.now() - 7200000)
          },
          {
            id: 'rec-2',
            analysisId: 'ai-mock-1',
            projectId: 'proj-1',
            title: 'Automate Snapshot Pruning on Scheduled Maintenance',
            category: 'VERIFIED_FACT',
            severity: 'LOW',
            complexity: 'S',
            reasoning: 'VaultRetentionManager guarantees preservation of pinned and newest recovery points.',
            expectedBenefits: 'Maintains bounded disk utilization on SSD storage.',
            dependencies: ['packages/vault/src/retention/retention-manager.ts'],
            status: 'PROPOSED',
            evidence: [
              {
                type: 'FILE',
                path: 'packages/vault/src/retention/retention-manager.ts',
                lineStart: 28,
                details: 'applyRetention protects sorted[0] and pinned snapshots.'
              }
            ],
            risks: ['None, safety invariants strictly enforced.'],
            implementationSteps: ['Add scheduled timer invocation'],
            acceptanceCriteria: ['Prune older than 90 days executed weekly.'],
            createdAt: new Date(Date.now() - 3600000)
          }
        ];
        return recs as TResponse;
      }

      case IPCChannels.AI_GET_ROADMAP: {
        const roadmap: AIRoadmap = {
          id: 'roadmap-1',
          projectId: 'proj-1',
          title: 'NIMO-DECK Production Launch Roadmap',
          milestones: [
            {
              phase: 1,
              name: 'Phase 7: DECK DASHBOARD',
              items: [
                {
                  id: 'item-1',
                  title: 'React 19 Shared UI Command Center',
                  complexity: 'L',
                  category: 'VERIFIED_FACT',
                  dependencies: ['packages/dashboard']
                },
                {
                  id: 'item-2',
                  title: 'Electron Desktop Sandbox & Secure Preload',
                  complexity: 'M',
                  category: 'VERIFIED_FACT',
                  dependencies: ['apps/desktop']
                }
              ]
            },
            {
              phase: 2,
              name: 'Phase 8: Multi-Device Sync & Windows Distribution',
              items: [
                {
                  id: 'item-3',
                  title: 'Production Packaging & Signed Installer',
                  complexity: 'M',
                  category: 'AI_HYPOTHESIS',
                  dependencies: ['apps/desktop']
                }
              ]
            }
          ],
          generatedAt: new Date()
        };
        return roadmap as TResponse;
      }

      case IPCChannels.AI_GET_MEMORY: {
        const memory: ProjectMemory = {
          id: 'mem-1',
          projectId: 'proj-1',
          commitSha: '7e38a37f59d4c1b98a3e78f6a39d8e7c5b4a3f12',
          purpose: 'Autonomous personal development operating system coordinating filesystems, Git, Drive, AI, and recovery.',
          architecture: 'Monorepo architecture with clean layer separation across shared, core, sync, github, drive, intelligence, and vault.',
          implementedFeatures: [
            'Local Git Sync Daemon with Chokidar monitoring & Pre-commit secret scanning',
            'GitHub OAuth integration, webhook ingress & rate limiting',
            'Google Drive ZIP snapshots, loop prevention & docs mirroring',
            'Multi-provider AI intelligence with fact-grounding & cost tracking',
            'Content-addressed storage (CAS) differential snapshots & tamper-evident audit logging'
          ],
          historicalDecisions: [
            'Git & GitHub represent the canonical source for active code history',
            'Google Drive serves exclusively for disaster recovery and documentation mirrors',
            'Tamper-evident audit logging with monotonic SHA-256 hash chaining'
          ],
          knownLimitations: [
            'Multi-device synchronization requires cloud PostgreSQL or shared Drive archive'
          ],
          currentState: 'Phase 6 completed. Phase 7 DECK DASHBOARD underway.',
          futureOpportunities: [
            'WebRTC peer-to-peer workspace sharing',
            'Hardware security module (HSM) signing for audit entries'
          ],
          updatedAt: new Date()
        };
        return memory as TResponse;
      }

      case IPCChannels.AI_GET_CROSS_PROJECT: {
        const insights: CrossProjectInsight[] = [
          {
            id: 'cpi-1',
            title: 'Shared Encryption & Entropy Utilities',
            type: 'SHARED_PACKAGE',
            projectIds: ['proj-1', 'proj-2'],
            description: 'Both NIMO-DECK and Apollo Telemetry employ Shannon entropy scoring for token detection.',
            recommendation: 'Extract crypto modules into a standalone micro-package.',
            licensingNotes: 'MIT License compatible.',
            createdAt: new Date()
          }
        ];
        return insights as TResponse;
      }

      case IPCChannels.TIMELINE_GET: {
        const timeline: TimelineEvent[] = [
          {
            id: 'evt-1',
            projectId: 'proj-1',
            timestamp: new Date(Date.now() - 1000 * 60 * 10),
            type: 'GIT_COMMIT',
            title: 'Git Commit: feat(vault): implement Phase 6 DECK VAULT',
            description: '40 files changed by Developer on branch main',
            actor: 'Developer',
            commitSha: '7e38a37'
          },
          {
            id: 'evt-2',
            projectId: 'proj-1',
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
            type: 'VAULT_SNAPSHOT',
            title: 'Vault Snapshot: Phase 6 Milestone Checkpoint',
            description: 'Captured FULL snapshot (128 files, 4.2 MB)',
            actor: 'SYSTEM',
            metadata: { rootHash: '7e38a37f59d4c1b98a3e78f6a39d8e7c' }
          },
          {
            id: 'evt-3',
            projectId: 'proj-1',
            timestamp: new Date(Date.now() - 1000 * 60 * 60),
            type: 'DRIVE_BACKUP',
            title: 'Google Drive SNAPSHOT Backup',
            description: 'Uploaded snapshot (2.4 MB) - status: COMPLETED',
            actor: 'SYSTEM'
          },
          {
            id: 'evt-4',
            projectId: 'proj-1',
            timestamp: new Date(Date.now() - 1000 * 60 * 120),
            type: 'AI_ANALYSIS',
            title: 'AI Intelligence Analysis (anthropic/claude-3.5-sonnet)',
            description: 'Completed cognitive audit using model anthropic/claude-3.5-sonnet',
            actor: 'AI_AGENT'
          }
        ];
        return timeline as TResponse;
      }

      case IPCChannels.VAULT_LIST_SNAPSHOTS: {
        const snapshots: VaultSnapshot[] = [
          {
            id: 'snap-1',
            projectId: 'proj-1',
            commitSha: '7e38a37f59d4c1b98a3e78f6a39d8e7c5b4a3f12',
            patchData: '',
            description: 'Phase 6 Golden Recovery Checkpoint',
            snapshotType: 'FULL',
            rootHash: '7e38a37f59d4c1b98a3e78f6a39d8e7c5b4a3f127e38a37f59d4c1b98a3e78f6',
            fileCount: 142,
            sizeBytes: 4210000,
            isPinned: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2)
          },
          {
            id: 'snap-2',
            projectId: 'proj-1',
            commitSha: 'e04efd0f59d4c1b98a3e78f6a39d8e7c5b4a3f12',
            patchData: '',
            description: 'Pre-Vault State Checkpoint',
            snapshotType: 'FULL',
            rootHash: 'e04efd0f59d4c1b98a3e78f6a39d8e7c5b4a3f12e04efd0f59d4c1b98a3e78f6',
            fileCount: 110,
            sizeBytes: 3100000,
            isPinned: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
          }
        ];
        return snapshots as TResponse;
      }

      case IPCChannels.VAULT_VERIFY_CHAIN: {
        return {
          isValid: true,
          totalVerified: 28,
          tamperEvidentGuarantee:
            'Tamper-evident verification confirms cryptographic continuity. Any altered payload, deleted row, or injected entry invalidates downstream SHA-256 hashes.'
        } as TResponse;
      }

      case IPCChannels.VAULT_RESTORE_PREVIEW: {
        const preview: RestorePreview = {
          snapshotId: 'snap-1',
          targetPath: 'C:\\Users\\manav\\OneDrive\\NIMO-DECK',
          filesToCreate: [],
          filesToOverwrite: ['packages/dashboard/src/services/mock-transport.ts'],
          filesToDelete: [],
          filesUnchanged: ['packages/shared/src/index.ts', 'packages/core/src/index.ts'],
          isWorkingTreeDirty: true,
          requiresConfirmation: true
        };
        return preview as TResponse;
      }

      case IPCChannels.VAULT_GENERATE_CHANGELOG: {
        const changelog: ChangelogRecord = {
          id: 'cl-1',
          projectId: 'proj-1',
          version: 'v1.6.0',
          title: 'NIMO-DECK Release v1.6.0 — Vault & Recovery Subsystem',
          markdown: '# Release v1.6.0\n\n### 🚀 New Features\n- Content-addressed differential project snapshots\n- Cryptographic SHA-256 hash chaining audit log\n- Safe disaster recovery with pre-restore safety snapshots',
          commitRange: 'e04efd0..7e38a37',
          features: ['Content-addressed storage', 'Cryptographic audit log'],
          fixes: ['Resolved path traversal in restore targets'],
          breakingChanges: [],
          aiNarrative: 'This release establishes the zero-data-loss foundation of NIMO-DECK.',
          generatedAt: new Date()
        };
        return changelog as TResponse;
      }

      case IPCChannels.SETTINGS_GET: {
        return { ...this.mockUserSettings } as TResponse;
      }

      case IPCChannels.SETTINGS_UPDATE: {
        const updates = p as Partial<UserSettings>;
        this.mockUserSettings = { ...this.mockUserSettings, ...updates };
        return { ...this.mockUserSettings } as TResponse;
      }

      case IPCChannels.SETTINGS_GET_CREDENTIAL_STATUS: {
        return {
          githubConfigured: true,
          googleDriveConfigured: true,
          aiProviders: [
            { provider: 'openrouter', configured: true },
            { provider: 'gemini', configured: false },
            { provider: 'openai', configured: true },
            { provider: 'claude', configured: false },
            { provider: 'ollama', configured: true }
          ]
        } as TResponse;
      }

      case IPCChannels.ONBOARDING_DISCOVER_PROJECTS: {
        return [
          { path: 'C:\\Users\\manav\\OneDrive\\NIMO-DECK', name: 'NIMO-DECK', isGitRepo: true, selected: true },
          { path: 'C:\\Projects\\Apollo-Telemetry', name: 'Apollo-Telemetry', isGitRepo: true, selected: true },
          { path: 'C:\\Projects\\Hermes-Mesh', name: 'Hermes-Mesh', isGitRepo: true, selected: false }
        ] as TResponse;
      }

      case 'notifications:list': {
        return [...this.mockNotifications] as TResponse;
      }

      case 'notifications:markRead': {
        const id = p?.id as string;
        const n = this.mockNotifications.find((x) => x.id === id);
        if (n) n.read = true;
        return { success: true } as TResponse;
      }

      default:
        return {} as TResponse;
    }
  }

  private eventListeners: Map<string, Set<(data: unknown) => void>> = new Map();

  subscribe<TEvent = unknown>(
    event: string,
    handler: (data: TEvent) => void
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    const handlers = this.eventListeners.get(event)!;
    const casted = handler as (data: unknown) => void;
    handlers.add(casted);

    return () => {
      handlers.delete(casted);
    };
  }

  dispatchLocalEvent(event: string, data: unknown): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach((h) => h(data));
    }
  }
}
