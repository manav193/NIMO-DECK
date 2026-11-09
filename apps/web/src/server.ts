import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import {
  createDatabaseConnection,
  runMigrations,
  ProjectRepository,
  RemoteSyncStateRepository,
  AIAnalysisRepository,
  ProjectMemoryRepository,
  AuditLogRepository,
  VaultRepository,
  DeckEventBus,
  type DeckDatabase
} from '@nimo-deck/core';
import { DeckVaultEngine } from '@nimo-deck/vault';
import { DeckIntelligenceEngine, ProviderRegistry } from '@nimo-deck/intelligence';
import { IPCChannels } from '@nimo-deck/shared';

export interface WebServerConfig {
  port?: number;
  host?: string;
  authToken?: string;
  dbPath?: string;
}

export class DeckWebServer {
  private server: http.Server | null = null;
  private readonly port: number;
  private readonly host: string;
  private readonly authToken?: string;

  private readonly db: DeckDatabase;
  private readonly eventBus: DeckEventBus;
  private readonly projectRepo: ProjectRepository;
  readonly remoteSyncRepo: RemoteSyncStateRepository;
  private readonly aiRepo: AIAnalysisRepository;
  private readonly memoryRepo: ProjectMemoryRepository;
  private readonly auditRepo: AuditLogRepository;
  private readonly vaultRepo: VaultRepository;
  private readonly vaultEngine: DeckVaultEngine;
  readonly intelligenceEngine: DeckIntelligenceEngine;

  constructor(config: WebServerConfig = {}) {
    this.port = config.port || parseInt(process.env.PORT || '3000', 10);
    this.host = config.host || '0.0.0.0';
    this.authToken = config.authToken || process.env.DECK_AUTH_TOKEN;

    const appDataDir = path.join(os.homedir(), '.nimo-deck');
    if (!fs.existsSync(appDataDir)) {
      fs.mkdirSync(appDataDir, { recursive: true });
    }

    const defaultDb = path.join(appDataDir, 'nimo-deck.sqlite');
    const conn = createDatabaseConnection({ filePath: config.dbPath || defaultDb });
    this.db = conn.db;
    runMigrations(conn.sqlite);

    this.eventBus = new DeckEventBus();
    this.projectRepo = new ProjectRepository(this.db);
    this.remoteSyncRepo = new RemoteSyncStateRepository(this.db);
    this.aiRepo = new AIAnalysisRepository(this.db);
    this.memoryRepo = new ProjectMemoryRepository(this.db);
    this.auditRepo = new AuditLogRepository(this.db);
    this.vaultRepo = new VaultRepository(this.db);

    const vaultDir = path.join(appDataDir, 'vault');
    this.vaultEngine = new DeckVaultEngine({
      db: this.db,
      vaultDir,
      eventBus: this.eventBus
    });

    const registry = new ProviderRegistry();
    this.intelligenceEngine = new DeckIntelligenceEngine({
      db: this.db,
      registry,
      eventBus: this.eventBus
    });
  }

  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

        if (url.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
          return;
        }

        if (url.pathname === '/api/deck/rpc' && req.method === 'POST') {
          // Check token if required
          if (this.authToken) {
            const authHeader = req.headers['authorization'];
            const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
            if (token !== this.authToken) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Unauthorized: Invalid or missing token' }));
              return;
            }
          }

          let bodyText = '';
          req.on('data', (chunk) => {
            bodyText += chunk;
          });

          req.on('end', async () => {
            try {
              const parsed = JSON.parse(bodyText);
              const { channel, payload } = parsed;
              const result = await this.handleRpc(channel, payload);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
            } catch (err: unknown) {
              const errorMessage = err instanceof Error ? err.message : String(err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: errorMessage }));
            }
          });
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
      });

      this.server.listen(this.port, this.host, () => {
        resolve(this.port);
      });

      this.server.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private async handleRpc(channel: string, payload: unknown): Promise<unknown> {
    const p = payload as Record<string, unknown> | undefined;

    switch (channel) {
      case IPCChannels.SYSTEM_GET_OVERVIEW: {
        const projects = await this.projectRepo.listAll();
        return {
          totalProjects: projects.length,
          activeProjects: projects.filter((x) => x.status === 'ACTIVE').length,
          syncedRepos: projects.length,
          pendingSyncCount: 0,
          totalSnapshots: 0,
          verifiedAuditRecords: 0,
          aiRecommendationsCount: 0
        };
      }

      case IPCChannels.PROJECT_LIST: {
        return this.projectRepo.listAll();
      }

      case IPCChannels.PROJECT_GET: {
        if (!p?.projectId) throw new Error('Missing projectId');
        return this.projectRepo.getById(p.projectId as string);
      }

      case IPCChannels.VAULT_LIST_SNAPSHOTS: {
        if (!p?.projectId) throw new Error('Missing projectId');
        return this.vaultRepo.listSnapshots(p.projectId as string);
      }

      case IPCChannels.VAULT_LIST_AUDIT_LOGS: {
        return this.auditRepo.listLogs(
          p?.projectId as string | undefined,
          (p?.limit as number) || 50
        );
      }

      case IPCChannels.VAULT_VERIFY_CHAIN: {
        return this.vaultEngine.verifyAuditChain(p?.projectId as string | undefined);
      }

      case IPCChannels.AI_GET_RECOMMENDATIONS: {
        if (!p?.projectId) throw new Error('Missing projectId');
        return this.aiRepo.listRecommendationsByProject(p.projectId as string);
      }

      case IPCChannels.AI_GET_MEMORY: {
        if (!p?.projectId) throw new Error('Missing projectId');
        return this.memoryRepo.getMemoryByProject(p.projectId as string);
      }

      case IPCChannels.GITHUB_LIST_REPOS:
      case IPCChannels.DRIVE_LIST_BACKUPS: {
        return [];
      }

      case IPCChannels.SETTINGS_GET: {
        return {
          general: { theme: 'dark', startAtLogin: false, minimizeToTray: true, checkUpdates: true },
          sync: { autoSync: true, syncIntervalSeconds: 30, pushMode: 'manual', debounceMs: 1500, scanSecrets: true },
          github: { defaultVisibility: 'private', syncBranches: true, syncIssues: true, syncPrs: true },
          drive: { enabled: false, backupFrequency: 'daily', snapshotRetentionDays: 30, compressBackups: true },
          intelligence: { activeProvider: 'openrouter', autoAnalyze: false, maxTokensPerQuery: 4096, costLimitMonthlyUsd: 25 },
          security: { encryptLocalVault: true, requireAuthPrompt: false, auditLoggingLevel: 'detailed' }
        };
      }

      default:
        return { acknowledged: true, channel };
    }
  }
}

// Auto-start if invoked directly via `node dist/server.js`
if (require.main === module) {
  const server = new DeckWebServer();
  server.start().then((port) => {
    console.log(`[DECK Web Server] Running on http://localhost:${port}`);
  }).catch((err) => {
    console.error('[DECK Web Server] Failed to start:', err);
    process.exit(1);
  });
}
