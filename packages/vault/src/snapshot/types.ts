import type {
  SnapshotType,
  VaultSnapshotManifest,
  VaultSnapshot
} from '@nimo-deck/shared';

export interface SnapshotCreateOptions {
  projectId: string;
  projectPath: string;
  description: string;
  snapshotType?: SnapshotType;
  parentSnapshotId?: string;
  gitCommitSha?: string;
  isPinned?: boolean;
}

export interface SnapshotComparisonResult {
  snapshotAId: string;
  snapshotBId: string;
  addedFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
  identicalFiles: string[];
}

export interface SnapshotBuildResult {
  snapshot: VaultSnapshot;
  manifest: VaultSnapshotManifest;
  newBlobsStored: number;
  deduplicatedBlobs: number;
}
