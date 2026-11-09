import type { DriveBackupService } from '@nimo-deck/drive';
import type { VaultRepository } from '@nimo-deck/core';
import type { DriveBackup, VaultSnapshot } from '@nimo-deck/shared';

export interface DriveVaultSyncComparison {
  localSnapshotsCount: number;
  driveBackupsCount: number;
  synchronizedCount: number;
  pendingUploadCount: number;
}

export class DriveVaultIntegration {
  constructor(
    private driveBackupService: DriveBackupService,
    private vaultRepo?: VaultRepository
  ) {
    void this.vaultRepo;
  }

  /**
   * Delegates snapshot archival to DECK DRIVE, avoiding duplication
   * and reusing the existing ZIP manifest contracts.
   */
  async archiveToDrive(params: {
    projectId: string;
    projectName: string;
    projectPath: string;
    gitCommitSha?: string;
    force?: boolean;
  }): Promise<{ backup: DriveBackup | null; skippedAsDuplicate: boolean }> {
    return this.driveBackupService.createSnapshot({
      projectId: params.projectId,
      projectName: params.projectName,
      projectPath: params.projectPath,
      gitCommitSha: params.gitCommitSha,
      force: params.force
    });
  }

  /**
   * Compares local Vault snapshots against Google Drive backup records.
   */
  compareLocalAndRemote(
    localSnapshots: VaultSnapshot[],
    driveBackups: DriveBackup[]
  ): DriveVaultSyncComparison {
    const driveShaSet = new Set(driveBackups.map((d) => d.snapshotSha256));

    let synchronized = 0;
    let pending = 0;

    for (const snap of localSnapshots) {
      if (snap.rootHash && driveShaSet.has(snap.rootHash)) {
        synchronized++;
      } else {
        pending++;
      }
    }

    return {
      localSnapshotsCount: localSnapshots.length,
      driveBackupsCount: driveBackups.length,
      synchronizedCount: synchronized,
      pendingUploadCount: pending
    };
  }
}
