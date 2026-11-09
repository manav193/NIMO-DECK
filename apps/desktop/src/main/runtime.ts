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

export class DesktopRuntime {
  readonly db: DeckDatabase;
  readonly eventBus: DeckEventBus;
  readonly appDataDir: string;

  // Repositories
  readonly projectRepo: ProjectRepository;
  readonly remoteSyncRepo: RemoteSyncStateRepository;
  readonly aiRepo: AIAnalysisRepository;
  readonly memoryRepo: ProjectMemoryRepository;
  readonly auditRepo: AuditLogRepository;
  readonly vaultRepo: VaultRepository;

  // Engines
  readonly providerRegistry: ProviderRegistry;
  readonly vaultEngine: DeckVaultEngine;
  readonly intelligenceEngine: DeckIntelligenceEngine;

  constructor(customDbPath?: string) {
    this.appDataDir = path.join(os.homedir(), '.nimo-deck');
    if (!fs.existsSync(this.appDataDir)) {
      fs.mkdirSync(this.appDataDir, { recursive: true });
    }

    const dbPath = customDbPath || path.join(this.appDataDir, 'nimo-deck.sqlite');
    const conn = createDatabaseConnection({ filePath: dbPath });
    this.db = conn.db;
    runMigrations(conn.sqlite);

    this.eventBus = new DeckEventBus();

    this.projectRepo = new ProjectRepository(this.db);
    this.remoteSyncRepo = new RemoteSyncStateRepository(this.db);
    this.aiRepo = new AIAnalysisRepository(this.db);
    this.memoryRepo = new ProjectMemoryRepository(this.db);
    this.auditRepo = new AuditLogRepository(this.db);
    this.vaultRepo = new VaultRepository(this.db);

    const vaultDir = path.join(this.appDataDir, 'vault');
    this.vaultEngine = new DeckVaultEngine({
      db: this.db,
      vaultDir,
      eventBus: this.eventBus
    });

    this.providerRegistry = new ProviderRegistry();
    this.intelligenceEngine = new DeckIntelligenceEngine({
      db: this.db,
      registry: this.providerRegistry,
      eventBus: this.eventBus
    });
  }
}
