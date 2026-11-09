import { eq } from 'drizzle-orm';
import type { DeckDatabase } from '../database/connection.js';
import { projects, syncConfigs } from '../database/schema.js';
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput
} from '@nimo-deck/shared';
import crypto from 'node:crypto';

export class ProjectRepository {
  constructor(private db: DeckDatabase) {}

  create(input: CreateProjectInput): Project {
    const id = crypto.randomUUID();
    const now = new Date();

    const newProject: typeof projects.$inferInsert = {
      id,
      name: input.name,
      localPath: input.localPath,
      gitRemoteUrl: input.gitRemoteUrl || null,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    };

    this.db.insert(projects).values(newProject).run();

    // Initialize default sync config for project
    this.db
      .insert(syncConfigs)
      .values({
        projectId: id,
        autoCommitEnabled: true,
        debounceWindowMs: 5000,
        maxWaitMs: 30000,
        autoPushMode: 'ON_COMMIT',
        pushIntervalSec: 300,
        aiCommitMessages: false,
        dryRunMode: false,
        updatedAt: now
      })
      .run();

    return {
      id,
      name: input.name,
      localPath: input.localPath,
      gitRemoteUrl: input.gitRemoteUrl,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    };
  }

  getById(id: string): Project | null {
    const row = this.db.select().from(projects).where(eq(projects.id, id)).get();
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      localPath: row.localPath,
      gitRemoteUrl: row.gitRemoteUrl,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  getByPath(localPath: string): Project | null {
    const row = this.db.select().from(projects).where(eq(projects.localPath, localPath)).get();
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      localPath: row.localPath,
      gitRemoteUrl: row.gitRemoteUrl,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  listAll(): Project[] {
    const rows = this.db.select().from(projects).all();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      localPath: row.localPath,
      gitRemoteUrl: row.gitRemoteUrl,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }

  update(id: string, input: UpdateProjectInput): Project | null {
    const now = new Date();
    const updateValues: Partial<typeof projects.$inferInsert> = {
      updatedAt: now
    };

    if (input.name !== undefined) updateValues.name = input.name;
    if (input.gitRemoteUrl !== undefined) updateValues.gitRemoteUrl = input.gitRemoteUrl;
    if (input.status !== undefined) updateValues.status = input.status as 'ACTIVE' | 'PAUSED' | 'ERROR';

    this.db.update(projects).set(updateValues).where(eq(projects.id, id)).run();
    return this.getById(id);
  }

  delete(id: string): boolean {
    const result = this.db.delete(projects).where(eq(projects.id, id)).run();
    return result.changes > 0;
  }
}
