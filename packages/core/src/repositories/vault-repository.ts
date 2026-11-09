import { eq, desc } from 'drizzle-orm';
import type { DeckDatabase } from '../database/connection.js';
import { vaultSnapshots, vaultRestoreOperations, vaultChangelogs } from '../database/schema.js';
import type {
  VaultSnapshot,
  SnapshotType,
  ChangelogRecord
} from '@nimo-deck/shared';
import crypto from 'node:crypto';

export class VaultRepository {
  constructor(private db: DeckDatabase) {}

  saveSnapshot(params: {
    projectId: string;
    description: string;
    patchData?: string;
    commitSha?: string;
    snapshotType?: SnapshotType;
    parentSnapshotId?: string;
    rootHash?: string;
    manifestJson?: string;
    fileCount?: number;
    sizeBytes?: number;
    isPinned?: boolean;
  }): VaultSnapshot {
    const id = crypto.randomUUID();
    const now = new Date();
    const snapType = params.snapshotType || 'FULL';

    this.db
      .insert(vaultSnapshots)
      .values({
        id,
        projectId: params.projectId,
        commitSha: params.commitSha || null,
        patchData: params.patchData || '',
        description: params.description,
        snapshotType: snapType,
        parentSnapshotId: params.parentSnapshotId || null,
        rootHash: params.rootHash || null,
        manifestJson: params.manifestJson || null,
        fileCount: params.fileCount ?? 0,
        sizeBytes: params.sizeBytes ?? 0,
        isPinned: params.isPinned ?? false,
        createdAt: now
      })
      .run();

    return {
      id,
      projectId: params.projectId,
      commitSha: params.commitSha,
      patchData: params.patchData || '',
      description: params.description,
      snapshotType: snapType,
      parentSnapshotId: params.parentSnapshotId,
      rootHash: params.rootHash,
      manifestJson: params.manifestJson,
      fileCount: params.fileCount ?? 0,
      sizeBytes: params.sizeBytes ?? 0,
      isPinned: params.isPinned ?? false,
      createdAt: now
    };
  }

  getSnapshot(id: string): VaultSnapshot | null {
    const row = this.db
      .select()
      .from(vaultSnapshots)
      .where(eq(vaultSnapshots.id, id))
      .limit(1)
      .get();

    if (!row) return null;

    return {
      id: row.id,
      projectId: row.projectId,
      commitSha: row.commitSha || undefined,
      patchData: row.patchData,
      description: row.description,
      snapshotType: row.snapshotType as SnapshotType,
      parentSnapshotId: row.parentSnapshotId || undefined,
      rootHash: row.rootHash || undefined,
      manifestJson: row.manifestJson || undefined,
      fileCount: row.fileCount,
      sizeBytes: row.sizeBytes,
      isPinned: Boolean(row.isPinned),
      createdAt: row.createdAt
    };
  }

  getLatestSnapshot(projectId: string): VaultSnapshot | null {
    const row = this.db
      .select()
      .from(vaultSnapshots)
      .where(eq(vaultSnapshots.projectId, projectId))
      .orderBy(desc(vaultSnapshots.createdAt))
      .limit(1)
      .get();

    if (!row) return null;

    return {
      id: row.id,
      projectId: row.projectId,
      commitSha: row.commitSha || undefined,
      patchData: row.patchData,
      description: row.description,
      snapshotType: row.snapshotType as SnapshotType,
      parentSnapshotId: row.parentSnapshotId || undefined,
      rootHash: row.rootHash || undefined,
      manifestJson: row.manifestJson || undefined,
      fileCount: row.fileCount,
      sizeBytes: row.sizeBytes,
      isPinned: Boolean(row.isPinned),
      createdAt: row.createdAt
    };
  }

  listSnapshots(projectId: string, limit = 50): VaultSnapshot[] {
    const rows = this.db
      .select()
      .from(vaultSnapshots)
      .where(eq(vaultSnapshots.projectId, projectId))
      .orderBy(desc(vaultSnapshots.createdAt))
      .limit(limit)
      .all();

    return rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      commitSha: r.commitSha || undefined,
      patchData: r.patchData,
      description: r.description,
      snapshotType: r.snapshotType as SnapshotType,
      parentSnapshotId: r.parentSnapshotId || undefined,
      rootHash: r.rootHash || undefined,
      manifestJson: r.manifestJson || undefined,
      fileCount: r.fileCount,
      sizeBytes: r.sizeBytes,
      isPinned: Boolean(r.isPinned),
      createdAt: r.createdAt
    }));
  }

  pinSnapshot(id: string, isPinned: boolean): boolean {
    const res = this.db
      .update(vaultSnapshots)
      .set({ isPinned })
      .where(eq(vaultSnapshots.id, id))
      .run();
    return res.changes > 0;
  }

  deleteSnapshot(id: string): boolean {
    const res = this.db
      .delete(vaultSnapshots)
      .where(eq(vaultSnapshots.id, id))
      .run();
    return res.changes > 0;
  }

  logRestoreOperation(params: {
    projectId: string;
    snapshotId: string;
    safetySnapshotId?: string;
    status: 'PENDING' | 'COMPLETED' | 'ROLLED_BACK' | 'FAILED';
    details: Record<string, unknown>;
  }): { id: string } {
    const id = crypto.randomUUID();
    const now = new Date();

    this.db
      .insert(vaultRestoreOperations)
      .values({
        id,
        projectId: params.projectId,
        snapshotId: params.snapshotId,
        safetySnapshotId: params.safetySnapshotId || null,
        status: params.status,
        detailsJson: JSON.stringify(params.details),
        createdAt: now
      })
      .run();

    return { id };
  }

  saveChangelog(params: {
    projectId: string;
    version: string;
    title: string;
    markdown: string;
    commitRange?: string;
    features: string[];
    fixes: string[];
    breakingChanges: string[];
    aiNarrative?: string;
  }): ChangelogRecord {
    const id = crypto.randomUUID();
    const now = new Date();

    this.db
      .insert(vaultChangelogs)
      .values({
        id,
        projectId: params.projectId,
        version: params.version,
        title: params.title,
        markdown: params.markdown,
        commitRange: params.commitRange || null,
        featuresJson: JSON.stringify(params.features),
        fixesJson: JSON.stringify(params.fixes),
        breakingChangesJson: JSON.stringify(params.breakingChanges),
        aiNarrative: params.aiNarrative || null,
        generatedAt: now
      })
      .run();

    return {
      id,
      projectId: params.projectId,
      version: params.version,
      title: params.title,
      markdown: params.markdown,
      commitRange: params.commitRange,
      features: params.features,
      fixes: params.fixes,
      breakingChanges: params.breakingChanges,
      aiNarrative: params.aiNarrative,
      generatedAt: now
    };
  }

  listChangelogs(projectId: string): ChangelogRecord[] {
    const rows = this.db
      .select()
      .from(vaultChangelogs)
      .where(eq(vaultChangelogs.projectId, projectId))
      .orderBy(desc(vaultChangelogs.generatedAt))
      .all();

    return rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      version: r.version,
      title: r.title,
      markdown: r.markdown,
      commitRange: r.commitRange || undefined,
      features: JSON.parse(r.featuresJson),
      fixes: JSON.parse(r.fixesJson),
      breakingChanges: JSON.parse(r.breakingChangesJson),
      aiNarrative: r.aiNarrative || undefined,
      generatedAt: r.generatedAt
    }));
  }
}
