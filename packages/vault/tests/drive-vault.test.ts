import { describe, it, expect, vi } from 'vitest';
import { DriveVaultIntegration } from '../src/drive-vault/drive-vault-integration.js';
import type { DriveBackupService } from '@nimo-deck/drive';
import type { DriveBackup, VaultSnapshot } from '@nimo-deck/shared';

describe('@nimo-deck/vault: DriveVaultIntegration', () => {
  it('should delegate snapshot archiving to DriveBackupService', async () => {
    const mockBackup: DriveBackup = {
      id: 'd-1',
      projectId: 'proj-1',
      driveFileId: 'drive-file-123',
      driveFolderId: 'folder-123',
      snapshotSha256: 'hash-abc-123',
      sizeBytes: 2048,
      backupType: 'SNAPSHOT',
      status: 'COMPLETED',
      createdAt: new Date()
    };

    const mockDriveService: Partial<DriveBackupService> = {
      createSnapshot: vi.fn().mockResolvedValue({
        backup: mockBackup,
        skippedAsDuplicate: false
      })
    };

    const integration = new DriveVaultIntegration(mockDriveService as DriveBackupService);

    const result = await integration.archiveToDrive({
      projectId: 'proj-1',
      projectName: 'Test App',
      projectPath: '/test/path'
    });

    expect(result.backup).toEqual(mockBackup);
    expect(result.skippedAsDuplicate).toBe(false);
    expect(mockDriveService.createSnapshot).toHaveBeenCalledWith({
      projectId: 'proj-1',
      projectName: 'Test App',
      projectPath: '/test/path',
      gitCommitSha: undefined,
      force: undefined
    });
  });

  it('should compare local Vault snapshots against remote Drive backups', () => {
    const integration = new DriveVaultIntegration({} as DriveBackupService);

    const localSnapshots: VaultSnapshot[] = [
      {
        id: 's-1',
        projectId: 'proj-1',
        description: 'Synced snapshot',
        patchData: '',
        snapshotType: 'FULL',
        rootHash: 'hash-matching-1',
        fileCount: 5,
        sizeBytes: 100,
        isPinned: false,
        createdAt: new Date()
      },
      {
        id: 's-2',
        projectId: 'proj-1',
        description: 'Local only snapshot',
        patchData: '',
        snapshotType: 'FULL',
        rootHash: 'hash-local-only-2',
        fileCount: 8,
        sizeBytes: 200,
        isPinned: false,
        createdAt: new Date()
      }
    ];

    const driveBackups: DriveBackup[] = [
      {
        id: 'd-1',
        projectId: 'proj-1',
        driveFileId: 'df-1',
        driveFolderId: 'folder-1',
        snapshotSha256: 'hash-matching-1',
        sizeBytes: 100,
        backupType: 'SNAPSHOT',
        status: 'COMPLETED',
        createdAt: new Date()
      }
    ];

    const comparison = integration.compareLocalAndRemote(localSnapshots, driveBackups);

    expect(comparison.localSnapshotsCount).toBe(2);
    expect(comparison.driveBackupsCount).toBe(1);
    expect(comparison.synchronizedCount).toBe(1);
    expect(comparison.pendingUploadCount).toBe(1);
  });
});
