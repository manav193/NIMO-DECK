import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SyncCoordinator,
  GitCLI
} from '../src/index.js';
import {
  createDatabaseConnection,
  ProjectRepository,
  SyncConfigRepository,
  SyncEventRepository,
  CommitHistoryRepository,
  RemoteSyncStateRepository
} from '@nimo-deck/core';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type Database from 'better-sqlite3';

describe('@nimo-deck/sync: SyncCoordinator End-to-End', () => {
  let tempRepo: string;
  let sqlite: Database.Database;
  let projectRepo: ProjectRepository;
  let syncConfigRepo: SyncConfigRepository;
  let syncEventRepo: SyncEventRepository;
  let commitHistoryRepo: CommitHistoryRepository;
  let remoteSyncStateRepo: RemoteSyncStateRepository;
  let coordinator: SyncCoordinator;
  const git = new GitCLI();

  beforeEach(async () => {
    // 1. Create a real temporary Git repository
    tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-sync-e2e-'));
    await git.exec(['init'], tempRepo);
    await git.exec(['config', 'user.name', 'NIMO Tester'], tempRepo);
    await git.exec(['config', 'user.email', 'test@nimo-deck.local'], tempRepo);

    // Initial commit to establish HEAD
    const readmePath = path.join(tempRepo, 'README.md');
    fs.writeFileSync(readmePath, '# Temp Test Repo');
    await git.exec(['add', 'README.md'], tempRepo);
    await git.exec(['commit', '-m', 'chore: initial test commit'], tempRepo);

    // 2. Setup In-Memory Database and Repositories
    const conn = createDatabaseConnection({ inMemory: true });
    sqlite = conn.sqlite;
    projectRepo = new ProjectRepository(conn.db);
    syncConfigRepo = new SyncConfigRepository(conn.db);
    syncEventRepo = new SyncEventRepository(conn.db);
    commitHistoryRepo = new CommitHistoryRepository(conn.db);
    remoteSyncStateRepo = new RemoteSyncStateRepository(conn.db);

    coordinator = new SyncCoordinator({
      git,
      syncConfigRepo,
      syncEventRepo,
      commitHistoryRepo,
      remoteSyncStateRepo
    });
  });

  afterEach(() => {
    sqlite.close();
    fs.rmSync(tempRepo, { recursive: true, force: true });
  });

  it('should automatically stage, generate conventional commit, and log events for safe files', async () => {
    const project = projectRepo.create({
      name: 'E2E-Repo',
      localPath: tempRepo
    });

    // Create a new safe source file
    const docFile = path.join(tempRepo, 'docs.md');
    fs.writeFileSync(docFile, '# Project Documentation\nTesting sync engine.');

    const result = await coordinator.syncRepository(project.id, tempRepo);

    expect(result.success).toBe(true);
    expect(result.commitCreated).toBe(true);
    expect(result.commitSha).toBeDefined();
    expect(result.quarantinedFiles).toHaveLength(0);

    // Verify commit in CommitHistoryRepository
    const latestCommit = commitHistoryRepo.getLatestCommit(project.id);
    expect(latestCommit).not.toBeNull();
    expect(latestCommit?.commitSha).toBe(result.commitSha);
    expect(latestCommit?.message).toContain('docs');

    // Verify event in SyncEventRepository
    const events = syncEventRepo.listByProject(project.id);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].eventType).toBe('COMMIT_CREATED');
  });

  it('should quarantine secrets and refuse to stage or commit them', async () => {
    const project = projectRepo.create({
      name: 'Secret-Repo',
      localPath: tempRepo
    });

    // Create a safe file AND a secret file
    fs.writeFileSync(path.join(tempRepo, 'safe.ts'), 'export const a = 1;');
    fs.writeFileSync(
      path.join(tempRepo, 'credentials.env'),
      'GITHUB_TOKEN="ghp_abcdefghijklmnopqrstuvwxyz0123456789"'
    );

    const result = await coordinator.syncRepository(project.id, tempRepo);

    expect(result.success).toBe(true);
    expect(result.quarantinedFiles.length).toBeGreaterThanOrEqual(1);
    expect(result.quarantinedFiles[0].path).toBe('credentials.env');

    // Verify Git status: credentials.env should NOT be committed or staged!
    const statusRes = await git.exec(['status', '--porcelain'], tempRepo);
    expect(statusRes.stdout).toContain('?? credentials.env'); // Remains untracked
  });

  it('should perform dry-run simulation without altering Git index or HEAD', async () => {
    const project = projectRepo.create({
      name: 'DryRun-Repo',
      localPath: tempRepo
    });

    // Enable dry-run mode
    syncConfigRepo.update(project.id, { dryRunMode: true });

    fs.writeFileSync(path.join(tempRepo, 'feature.ts'), 'export const feature = true;');

    const result = await coordinator.syncRepository(project.id, tempRepo, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.commitCreated).toBe(false);

    // Working tree must remain uncommitted
    const statusRes = await git.exec(['status', '--porcelain'], tempRepo);
    expect(statusRes.stdout).toContain('?? feature.ts');
  });
});
