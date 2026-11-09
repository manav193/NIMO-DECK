import { eq, desc } from 'drizzle-orm';
import type { DeckDatabase } from '../database/connection.js';
import { projectMemories } from '../database/schema.js';
import type { ProjectMemory } from '@nimo-deck/shared';
import crypto from 'node:crypto';

export class ProjectMemoryRepository {
  constructor(private db: DeckDatabase) {}

  upsertMemory(params: {
    projectId: string;
    commitSha?: string;
    purpose: string;
    architecture: string;
    implementedFeatures: string[];
    historicalDecisions: string[];
    knownLimitations: string[];
    currentState: string;
    futureOpportunities: string[];
  }): ProjectMemory {
    const existing = this.getMemoryByProject(params.projectId);
    const now = new Date();
    const id = existing?.id || crypto.randomUUID();

    if (existing) {
      this.db
        .update(projectMemories)
        .set({
          commitSha: params.commitSha || null,
          purpose: params.purpose,
          architecture: params.architecture,
          implementedFeaturesJson: JSON.stringify(params.implementedFeatures),
          historicalDecisionsJson: JSON.stringify(params.historicalDecisions),
          knownLimitationsJson: JSON.stringify(params.knownLimitations),
          currentState: params.currentState,
          futureOpportunitiesJson: JSON.stringify(params.futureOpportunities),
          updatedAt: now
        })
        .where(eq(projectMemories.id, id))
        .run();
    } else {
      this.db
        .insert(projectMemories)
        .values({
          id,
          projectId: params.projectId,
          commitSha: params.commitSha || null,
          purpose: params.purpose,
          architecture: params.architecture,
          implementedFeaturesJson: JSON.stringify(params.implementedFeatures),
          historicalDecisionsJson: JSON.stringify(params.historicalDecisions),
          knownLimitationsJson: JSON.stringify(params.knownLimitations),
          currentState: params.currentState,
          futureOpportunitiesJson: JSON.stringify(params.futureOpportunities),
          updatedAt: now
        })
        .run();
    }

    return {
      id,
      projectId: params.projectId,
      commitSha: params.commitSha,
      purpose: params.purpose,
      architecture: params.architecture,
      implementedFeatures: params.implementedFeatures,
      historicalDecisions: params.historicalDecisions,
      knownLimitations: params.knownLimitations,
      currentState: params.currentState,
      futureOpportunities: params.futureOpportunities,
      updatedAt: now
    };
  }

  getMemoryByProject(projectId: string): ProjectMemory | null {
    const row = this.db
      .select()
      .from(projectMemories)
      .where(eq(projectMemories.projectId, projectId))
      .orderBy(desc(projectMemories.updatedAt))
      .limit(1)
      .get();

    if (!row) return null;

    return {
      id: row.id,
      projectId: row.projectId,
      commitSha: row.commitSha || undefined,
      purpose: row.purpose,
      architecture: row.architecture,
      implementedFeatures: JSON.parse(row.implementedFeaturesJson),
      historicalDecisions: JSON.parse(row.historicalDecisionsJson),
      knownLimitations: JSON.parse(row.knownLimitationsJson),
      currentState: row.currentState,
      futureOpportunities: JSON.parse(row.futureOpportunitiesJson),
      updatedAt: row.updatedAt
    };
  }
}
