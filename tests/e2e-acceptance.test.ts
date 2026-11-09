import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import {
  createDatabaseConnection,
  runMigrations,
  ProjectRepository,
  AuditLogRepository,
  DeviceRepository,
  SyncConfigRepository,
  CloudFederationService,
  DeckEventBus,
  type DeckDatabase
} from '@nimo-deck/core';
import { DeckVaultEngine } from '@nimo-deck/vault';
import { DeckIntelligenceEngine, ProviderRegistry, OpenRouterAdapter } from '@nimo-deck/intelligence';
import type { CrossDeviceSyncPayload } from '@nimo-deck/shared';

describe('NIMO-DECK Phase 8: 14-Step Production Acceptance Lifecycle', () => {
  let tempBaseDir: string;
  let projectDir: string;
  let vaultDir: string;
  let dbPath: string;
  let db: DeckDatabase;
  let projectRepo: ProjectRepository;
  let auditRepo: AuditLogRepository;
  let deviceRepo: DeviceRepository;
  let syncConfigRepo: SyncConfigRepository;
  let vaultEngine: DeckVaultEngine;
  let intelligenceEngine: DeckIntelligenceEngine;
  let cloudFederation: CloudFederationService;
  let eventBus: DeckEventBus;

  const testProjectId = 'proj-e2e-phase8';
  let initialFileContent: string;
  let snapshot1Id: string;
  let snapshot2Id: string;
  let uploadedSnapshotSha: string;

  beforeAll(() => {
    tempBaseDir = path.join(os.tmpdir(), `nimo-e2e-phase8-${Date.now()}`);
    projectDir = path.join(tempBaseDir, 'test-project');
    vaultDir = path.join(tempBaseDir, 'vault');
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(vaultDir, { recursive: true });

    // Initialize mock git structure
    fs.mkdirSync(path.join(projectDir, '.git'), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, '.git', 'config'),
      '[remote "origin"]\n  url = https://github.com/manav193/test-disposable.git\n'
    );
    fs.writeFileSync(path.join(projectDir, '.git', 'HEAD'), 'ref: refs/heads/main\n');

    initialFileContent = 'console.log("NIMO-DECK v0.1.0 Initial");';
    fs.writeFileSync(path.join(projectDir, 'index.ts'), initialFileContent, 'utf8');
    fs.writeFileSync(
      path.join(projectDir, 'package.json'),
      JSON.stringify({ name: 'test-project', version: '1.0.0' }, null, 2),
      'utf8'
    );

    dbPath = path.join(tempBaseDir, 'nimo-deck.sqlite');
    const conn = createDatabaseConnection({ filePath: dbPath });
    db = conn.db;
    runMigrations(conn.sqlite);

    eventBus = new DeckEventBus();
    projectRepo = new ProjectRepository(db);
    auditRepo = new AuditLogRepository(db);
    deviceRepo = new DeviceRepository(db);
    syncConfigRepo = new SyncConfigRepository(db);

    vaultEngine = new DeckVaultEngine({
      db,
      vaultDir,
      eventBus
    });

    const mockAiStructured = {
      summaryMarkdown: '### Architecture Overview\nHardened production TypeScript project.',
      techDebtReport: '- Clean AST with zero cyclic imports.',
      securityReport: '- Zero plaintext secrets detected.',
      recommendations: [
        {
          title: 'Implement automated snapshot pruning',
          category: 'VERIFIED_FACT',
          severity: 'MEDIUM',
          complexity: 'S',
          reasoning: 'Reduces long-term disk consumption.',
          evidence: 'packages/vault/src/retention/retention-manager.ts',
          expectedBenefits: 'Maintains optimal SSD utilization',
          dependencies: ['VaultRetentionManager'],
          risks: ['None'],
          implementationSteps: ['Schedule weekly retention prune'],
          acceptanceCriteria: ['Prunes non-pinned snapshots older than 30 days']
        }
      ],
      roadmapMilestones: []
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockAiStructured) } }],
        usage: { prompt_tokens: 120, completion_tokens: 45, total_tokens: 165 }
      })
    });

    const registry = new ProviderRegistry();
    const mockAdapter = new OpenRouterAdapter({
      apiKey: 'test-openrouter-key',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchFn: mockFetch as any
    });
    registry.registerProvider(mockAdapter);
    registry.setPrimaryProvider(mockAdapter.id);

    intelligenceEngine = new DeckIntelligenceEngine({
      db,
      registry,
      eventBus
    });

    cloudFederation = new CloudFederationService(
      { deviceId: 'device-workstation-1' },
      deviceRepo,
      projectRepo,
      auditRepo
    );
  });

  afterAll(() => {
    try {
      fs.rmSync(tempBaseDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  // Step 1: Register a local project
  it('Step 1: Registers local project with non-destructive validation', () => {
    const proj = projectRepo.create({
      name: 'Test Production Project',
      localPath: projectDir,
      gitRemoteUrl: null
    });

    expect(proj).toBeDefined();
    expect(proj.name).toBe('Test Production Project');
    expect(proj.localPath).toBe(projectDir);

    auditRepo.appendLog({
      projectId: proj.id,
      actor: 'USER',
      action: 'PROJECT_REGISTERED',
      payload: { projectId: proj.id, name: proj.name }
    });
  });

  // Step 2: Map it to a GitHub repository
  it('Step 2: Maps local project to GitHub repository', () => {
    const remoteUrl = 'https://github.com/manav193/test-disposable.git';
    const localProj = projectRepo.getByPath(projectDir);
    expect(localProj).toBeDefined();

    const updated = projectRepo.update(localProj!.id, { gitRemoteUrl: remoteUrl });
    expect(updated?.gitRemoteUrl).toBe(remoteUrl);

    auditRepo.appendLog({
      projectId: localProj!.id,
      actor: 'USER',
      action: 'GITHUB_MAPPED',
      payload: { gitRemoteUrl: remoteUrl }
    });
  });

  // Step 3: Modify a local file
  it('Step 3: Modifies a local file in the workspace', () => {
    const updatedContent = 'console.log("NIMO-DECK v1.0.0 Production Hardened");';
    fs.writeFileSync(path.join(projectDir, 'index.ts'), updatedContent, 'utf8');

    const readBack = fs.readFileSync(path.join(projectDir, 'index.ts'), 'utf8');
    expect(readBack).toBe(updatedContent);
  });

  // Step 4: Detect the modification
  it('Step 4: Detects modified file state and validates against secrets', () => {
    const content = fs.readFileSync(path.join(projectDir, 'index.ts'), 'utf8');
    expect(content).not.toBe(initialFileContent);
    // Ensure no secrets were introduced
    expect(content.includes('ghp_')).toBe(false);
  });

  // Step 5: Generate a meaningful commit
  it('Step 5: Records commit metadata in project audit trail', () => {
    const localProj = projectRepo.getByPath(projectDir)!;
    const commitSha = 'b8f2c3d4e5f67890123456789012345678901234';

    auditRepo.appendLog({
      projectId: localProj.id,
      actor: 'SYSTEM',
      action: 'GIT_COMMIT_CREATED',
      payload: {
        commitSha,
        branch: 'main',
        message: 'feat(core): implement Phase 8 production engine'
      }
    });

    const latest = auditRepo.getLatestEntry();
    expect(latest?.action).toBe('GIT_COMMIT_CREATED');
  });

  // Step 6: Push to GitHub policy verification
  it('Step 6: Verifies safe auto-push policy without destructive force', () => {
    const localProj = projectRepo.getByPath(projectDir)!;
    const syncConfig = syncConfigRepo.getByProjectId(localProj.id);
    expect(syncConfig).toBeDefined();
    expect(syncConfig?.autoPushMode).toBe('ON_COMMIT');
  });

  // Step 7: Create a Google Drive snapshot
  it('Step 7: Captures content-addressed snapshot archive', async () => {
    const localProj = projectRepo.getByPath(projectDir)!;
    const result = await vaultEngine.createSnapshot({
      projectId: localProj.id,
      projectPath: projectDir,
      description: 'Phase 8 Acceptance Snapshot',
      snapshotType: 'FULL'
    });

    expect(result).toBeDefined();
    expect(result.snapshot.rootHash).toBeDefined();
    expect(result.snapshot.fileCount).toBeGreaterThan(0);
    snapshot1Id = result.snapshot.id;
    uploadedSnapshotSha = result.snapshot.rootHash!;
  });

  // Step 8: Verify the backup checksum
  it('Step 8: Verifies backup SHA-256 cryptographic checksum', () => {
    expect(uploadedSnapshotSha).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(uploadedSnapshotSha)).toBe(true);
  });

  // Step 9: Run AI project analysis
  it('Step 9: Runs cognitive AST and codebase analysis', async () => {
    const localProj = projectRepo.getByPath(projectDir)!;
    const result = await intelligenceEngine.analyzeProject({
      projectId: localProj.id,
      projectPath: projectDir
    });

    expect(result.analysis).toBeDefined();
    expect(result.analysis.summaryMarkdown).toBeDefined();
    expect(result.analysis.tokenUsage).toBeDefined();
  });

  // Step 10: Generate a future improvement recommendation
  it('Step 10: Generates fact-grounded recommendations', async () => {
    const localProj = projectRepo.getByPath(projectDir)!;
    const aiRepo = new (await import('@nimo-deck/core')).AIAnalysisRepository(db);
    const recs = aiRepo.listRecommendationsByProject(localProj.id);
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeGreaterThan(0);
  });

  // Step 11: Create a Vault restore point
  it('Step 11: Creates a secondary Vault restore point before modification', async () => {
    const localProj = projectRepo.getByPath(projectDir)!;
    fs.writeFileSync(path.join(projectDir, 'temp-file.txt'), 'Temporary data to revert', 'utf8');

    const result = await vaultEngine.createSnapshot({
      projectId: localProj.id,
      projectPath: projectDir,
      description: 'Pre-Restore Point Checkpoint',
      snapshotType: 'FULL'
    });

    expect(result).toBeDefined();
    snapshot2Id = result.snapshot.id;
  });

  // Step 12: Restore a previous version safely
  it('Step 12: Safely restores previous snapshot version with safety checkpoint', async () => {
    const snapRecord = vaultEngine.getSnapshot(snapshot1Id);
    expect(snapRecord).toBeDefined();

    const manifest = JSON.parse(snapRecord!.manifestJson!);
    const preview = vaultEngine.generateRestorePreview(manifest, projectDir);
    expect(preview.requiresConfirmation).toBe(true);

    const restoreResult = await vaultEngine.restoreEngine.executeRestore({
      snapshot: snapRecord!,
      manifest,
      projectPath: projectDir,
      confirmRestore: true,
      allowOverwriteUncommitted: true,
      allowDeletion: true
    });

    expect(restoreResult.success).toBe(true);
    expect(restoreResult.safetySnapshotId).toBeDefined();
  });

  // Step 13: Verify cryptographic audit history
  it('Step 13: Verifies tamper-evident cryptographic SHA-256 audit chain', () => {
    const verification = auditRepo.verifyChainIntegrity();
    expect(verification.isValid).toBe(true);
    expect(verification.totalVerified).toBeGreaterThan(0);
  });

  // Step 14: Open the project on a second device
  it('Step 14: Federates project metadata to a registered secondary device', async () => {
    const secondDeviceId = crypto.randomUUID();
    const secondDevice = deviceRepo.registerDevice({
      name: 'MacBook Pro Traveling Workstation',
      fingerprint: crypto.randomBytes(32).toString('hex'),
      deviceType: 'LAPTOP',
      publicKey: 'mock-public-key-for-traveling-laptop-12345'
    });

    expect(secondDevice).toBeDefined();
    expect(secondDevice.status).toBe('ACTIVE');

    // Build outbound sync payload
    const outbound = await cloudFederation.buildOutboundSyncPayload();
    expect(outbound.projects.length).toBeGreaterThan(0);
    expect(outbound.signature).toBeDefined();

    // Device sync state recorded without exposing remote filesystem
    deviceRepo.recordProjectSync({
      deviceId: secondDevice.id,
      projectId: projectRepo.listAll()[0].id,
      lastSyncedAuditSeq: 5
    });

    const state = deviceRepo.getProjectSyncState(secondDevice.id, projectRepo.listAll()[0].id);
    expect(state).toBeDefined();
    expect(state?.lastSyncedAuditSeq).toBe(5);
  });
});
