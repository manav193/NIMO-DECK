import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  DriveBackupService,
  GoogleDriveClient,
  GoogleOAuthHandler
} from '../src/index.js';
import {
  createDatabaseConnection,
  ProjectRepository,
  SyncEventRepository
} from '@nimo-deck/core';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type Database from 'better-sqlite3';

describe('@nimo-deck/drive: DriveBackupService End-to-End', () => {
  let projectDir: string;
  let restoreDir: string;
  let sqlite: Database.Database;
  let projectRepo: ProjectRepository;
  let syncEventRepo: SyncEventRepository;
  let backupService: DriveBackupService;
  let uploadedCount = 0;
  let lastUploadedContent: Buffer | null = null;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-service-src-'));
    restoreDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-service-dst-'));
    uploadedCount = 0;
    lastUploadedContent = null;

    fs.writeFileSync(path.join(projectDir, 'README.md'), '# Backup Service Test');
    fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'src', 'main.ts'), 'console.log("running");');

    const conn = createDatabaseConnection({ inMemory: true });
    sqlite = conn.sqlite;
    projectRepo = new ProjectRepository(conn.db);
    syncEventRepo = new SyncEventRepository(conn.db);

    const mockFetcher: typeof fetch = async (input, init) => {
      const url = String(input);

      // Search folder
      if (url.includes('/files?q=')) {
        return new Response(JSON.stringify({ files: [{ id: 'mock-folder-id', name: 'NIMO-DECK' }] }), {
          status: 200
        });
      }

      // Upload file
      if (url.includes('/files?uploadType=multipart')) {
        uploadedCount++;
        // Capture content from multipart body
        if (init?.body) {
          lastUploadedContent = Buffer.from(init.body as Buffer);
        }
        return new Response(
          JSON.stringify({
            id: `drive-file-${uploadedCount}`,
            name: 'snapshot-2026.zip',
            size: '1024'
          }),
          { status: 200 }
        );
      }

      // Download file
      if (url.includes('?alt=media')) {
        return new Response(lastUploadedContent || Buffer.from('mock-zip'), { status: 200 });
      }

      return new Response('{}', { status: 200 });
    };

    const oauth = new GoogleOAuthHandler({ clientId: 'cid', clientSecret: 'csec' });
    oauth.setManualToken({ accessToken: 'valid_token', expiresAt: Date.now() + 100000 });
    const driveClient = new GoogleDriveClient({ oauthHandler: oauth, fetcher: mockFetcher });

    backupService = new DriveBackupService({
      driveClient,
      db: conn.db,
      projectRepo,
      syncEventRepo
    });
  });

  afterEach(() => {
    sqlite.close();
    fs.rmSync(projectDir, { recursive: true, force: true });
    fs.rmSync(restoreDir, { recursive: true, force: true });
  });

  it('should create and upload snapshot and record it in database', async () => {
    const project = projectRepo.create({
      name: 'BackupApp',
      localPath: projectDir
    });

    const res = await backupService.createSnapshot({
      projectId: project.id,
      projectName: project.name,
      projectPath: projectDir
    });

    expect(res.skippedAsDuplicate).toBe(false);
    expect(res.backup).not.toBeNull();
    expect(res.backup?.driveFileId).toBe('drive-file-1');
    expect(uploadedCount).toBe(1);

    // Verify latest backup in database
    const latest = backupService.getLatestBackup(project.id);
    expect(latest).not.toBeNull();
    expect(latest?.id).toBe(res.backup?.id);
  });

  it('should prevent duplicate uploads when workspace has not changed', async () => {
    const project = projectRepo.create({
      name: 'DuplicateApp',
      localPath: projectDir
    });

    // First upload
    const res1 = await backupService.createSnapshot({
      projectId: project.id,
      projectName: project.name,
      projectPath: projectDir
    });
    expect(res1.skippedAsDuplicate).toBe(false);
    expect(uploadedCount).toBe(1);

    // Second upload without any file modifications
    const res2 = await backupService.createSnapshot({
      projectId: project.id,
      projectName: project.name,
      projectPath: projectDir
    });
    expect(res2.skippedAsDuplicate).toBe(true);
    expect(uploadedCount).toBe(1); // No new upload made!
  });
});
