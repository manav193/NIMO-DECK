import { eq, desc } from 'drizzle-orm';
import type { DeckDatabase } from '../database/connection.js';
import { aiAnalyses, aiRecommendations } from '../database/schema.js';
import type {
  AIAnalysis,
  AIRecommendation,
  RecommendationStatus,
  FactCategory,
  SeverityLevel,
  ComplexityScore
} from '@nimo-deck/shared';
import crypto from 'node:crypto';

export class AIAnalysisRepository {
  constructor(private db: DeckDatabase) {}

  saveAnalysis(params: {
    projectId: string;
    modelUsed: string;
    summaryMarkdown: string;
    techDebtReport: string;
    securityReport: string;
  }): AIAnalysis {
    const id = crypto.randomUUID();
    const now = new Date();

    const record: typeof aiAnalyses.$inferInsert = {
      id,
      projectId: params.projectId,
      modelUsed: params.modelUsed,
      summaryMarkdown: params.summaryMarkdown,
      techDebtReport: params.techDebtReport,
      securityReport: params.securityReport,
      createdAt: now
    };

    this.db.insert(aiAnalyses).values(record).run();

    return {
      id,
      projectId: params.projectId,
      modelUsed: params.modelUsed,
      summaryMarkdown: params.summaryMarkdown,
      techDebtReport: params.techDebtReport,
      securityReport: params.securityReport,
      recommendations: [],
      createdAt: now
    };
  }

  getLatestAnalysis(projectId: string): AIAnalysis | null {
    const row = this.db
      .select()
      .from(aiAnalyses)
      .where(eq(aiAnalyses.projectId, projectId))
      .orderBy(desc(aiAnalyses.createdAt))
      .limit(1)
      .get();

    if (!row) return null;

    const recs = this.listRecommendationsByAnalysis(row.id);

    return {
      id: row.id,
      projectId: row.projectId,
      modelUsed: row.modelUsed,
      summaryMarkdown: row.summaryMarkdown,
      techDebtReport: row.techDebtReport,
      securityReport: row.securityReport,
      recommendations: recs,
      createdAt: row.createdAt
    };
  }

  saveRecommendation(params: {
    analysisId: string;
    projectId: string;
    title: string;
    category: FactCategory;
    severity: SeverityLevel;
    complexity: ComplexityScore;
    reasoning: string;
    expectedBenefits: string;
    dependencies: string[];
    implementationSteps: string[];
    suggestedDiffSnippet?: string;
  }): AIRecommendation {
    const id = crypto.randomUUID();
    const now = new Date();

    const record: typeof aiRecommendations.$inferInsert = {
      id,
      analysisId: params.analysisId,
      projectId: params.projectId,
      title: params.title,
      category: params.category as 'VERIFIED_FACT' | 'AI_HYPOTHESIS',
      severity: params.severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
      complexity: params.complexity as 'XS' | 'S' | 'M' | 'L' | 'XL',
      reasoning: params.reasoning,
      expectedBenefits: params.expectedBenefits,
      dependenciesJson: JSON.stringify(params.dependencies),
      implementationStepsJson: JSON.stringify(params.implementationSteps),
      suggestedDiffSnippet: params.suggestedDiffSnippet || null,
      status: 'PROPOSED',
      createdAt: now
    };

    this.db.insert(aiRecommendations).values(record).run();

    return {
      id,
      analysisId: params.analysisId,
      projectId: params.projectId,
      title: params.title,
      category: params.category as 'VERIFIED_FACT' | 'AI_HYPOTHESIS',
      severity: params.severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
      complexity: params.complexity as 'XS' | 'S' | 'M' | 'L' | 'XL',
      reasoning: params.reasoning,
      expectedBenefits: params.expectedBenefits,
      dependencies: params.dependencies,
      implementationSteps: params.implementationSteps,
      suggestedDiffSnippet: params.suggestedDiffSnippet,
      status: 'PROPOSED',
      createdAt: now
    };
  }

  listRecommendationsByProject(projectId: string): AIRecommendation[] {
    const rows = this.db
      .select()
      .from(aiRecommendations)
      .where(eq(aiRecommendations.projectId, projectId))
      .orderBy(desc(aiRecommendations.createdAt))
      .all();

    return rows.map((row) => ({
      id: row.id,
      analysisId: row.analysisId,
      projectId: row.projectId,
      title: row.title,
      category: row.category,
      severity: row.severity,
      complexity: row.complexity,
      reasoning: row.reasoning,
      expectedBenefits: row.expectedBenefits,
      dependencies: JSON.parse(row.dependenciesJson),
      implementationSteps: JSON.parse(row.implementationStepsJson),
      suggestedDiffSnippet: row.suggestedDiffSnippet || undefined,
      status: row.status,
      createdAt: row.createdAt
    }));
  }

  listRecommendationsByAnalysis(analysisId: string): AIRecommendation[] {
    const rows = this.db
      .select()
      .from(aiRecommendations)
      .where(eq(aiRecommendations.analysisId, analysisId))
      .orderBy(desc(aiRecommendations.createdAt))
      .all();

    return rows.map((row) => ({
      id: row.id,
      analysisId: row.analysisId,
      projectId: row.projectId,
      title: row.title,
      category: row.category,
      severity: row.severity,
      complexity: row.complexity,
      reasoning: row.reasoning,
      expectedBenefits: row.expectedBenefits,
      dependencies: JSON.parse(row.dependenciesJson),
      implementationSteps: JSON.parse(row.implementationStepsJson),
      suggestedDiffSnippet: row.suggestedDiffSnippet || undefined,
      status: row.status,
      createdAt: row.createdAt
    }));
  }

  updateRecommendationStatus(id: string, status: RecommendationStatus): boolean {
    const result = this.db
      .update(aiRecommendations)
      .set({ status: status as 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'RESOLVED' })
      .where(eq(aiRecommendations.id, id))
      .run();

    return result.changes > 0;
  }
}
