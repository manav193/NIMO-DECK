import { eq, desc, and } from 'drizzle-orm';
import type { DeckDatabase } from '../database/connection.js';
import { aiAnalyses, aiRecommendations, crossProjectInsights } from '../database/schema.js';
import type {
  AIAnalysis,
  AIRecommendation,
  RecommendationStatus,
  FactCategory,
  SeverityLevel,
  ComplexityScore,
  TokenUsage,
  CrossProjectInsight
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
    commitSha?: string;
    promptVersion?: string;
    tokenUsage?: TokenUsage;
  }): AIAnalysis {
    const id = crypto.randomUUID();
    const now = new Date();

    const record: typeof aiAnalyses.$inferInsert = {
      id,
      projectId: params.projectId,
      modelUsed: params.modelUsed,
      commitSha: params.commitSha || null,
      promptVersion: params.promptVersion || 'v1.0',
      summaryMarkdown: params.summaryMarkdown,
      techDebtReport: params.techDebtReport,
      securityReport: params.securityReport,
      tokenUsageJson: params.tokenUsage ? JSON.stringify(params.tokenUsage) : null,
      createdAt: now
    };

    this.db.insert(aiAnalyses).values(record).run();

    return {
      id,
      projectId: params.projectId,
      modelUsed: params.modelUsed,
      commitSha: params.commitSha,
      promptVersion: params.promptVersion,
      summaryMarkdown: params.summaryMarkdown,
      techDebtReport: params.techDebtReport,
      securityReport: params.securityReport,
      tokenUsage: params.tokenUsage,
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
    const tokenUsage = row.tokenUsageJson ? (JSON.parse(row.tokenUsageJson) as TokenUsage) : undefined;

    return {
      id: row.id,
      projectId: row.projectId,
      modelUsed: row.modelUsed,
      commitSha: row.commitSha || undefined,
      promptVersion: row.promptVersion || undefined,
      summaryMarkdown: row.summaryMarkdown,
      techDebtReport: row.techDebtReport,
      securityReport: row.securityReport,
      tokenUsage,
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
    evidence?: string;
    risks?: string[];
    acceptanceCriteria?: string[];
    suggestedDiffSnippet?: string;
    status?: RecommendationStatus;
  }): AIRecommendation {
    const id = crypto.randomUUID();
    const now = new Date();
    const statusVal: RecommendationStatus = params.status || 'PROPOSED';

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
      dependenciesJson: JSON.stringify(params.dependencies || []),
      implementationStepsJson: JSON.stringify(params.implementationSteps || []),
      suggestedDiffSnippet: params.suggestedDiffSnippet || null,
      status: statusVal,
      evidence: params.evidence || null,
      risksJson: params.risks ? JSON.stringify(params.risks) : null,
      acceptanceCriteriaJson: params.acceptanceCriteria
        ? JSON.stringify(params.acceptanceCriteria)
        : null,
      createdAt: now
    };

    this.db.insert(aiRecommendations).values(record).run();

    return {
      id,
      analysisId: params.analysisId,
      projectId: params.projectId,
      title: params.title,
      category: params.category,
      severity: params.severity,
      complexity: params.complexity,
      reasoning: params.reasoning,
      expectedBenefits: params.expectedBenefits,
      dependencies: params.dependencies || [],
      implementationSteps: params.implementationSteps || [],
      evidence: params.evidence,
      risks: params.risks || [],
      acceptanceCriteria: params.acceptanceCriteria || [],
      suggestedDiffSnippet: params.suggestedDiffSnippet,
      status: statusVal,
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
      category: row.category as FactCategory,
      severity: row.severity as SeverityLevel,
      complexity: row.complexity as ComplexityScore,
      reasoning: row.reasoning,
      expectedBenefits: row.expectedBenefits,
      dependencies: JSON.parse(row.dependenciesJson),
      implementationSteps: JSON.parse(row.implementationStepsJson),
      evidence: row.evidence || undefined,
      risks: row.risksJson ? JSON.parse(row.risksJson) : [],
      acceptanceCriteria: row.acceptanceCriteriaJson ? JSON.parse(row.acceptanceCriteriaJson) : [],
      suggestedDiffSnippet: row.suggestedDiffSnippet || undefined,
      status: row.status as RecommendationStatus,
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
      category: row.category as FactCategory,
      severity: row.severity as SeverityLevel,
      complexity: row.complexity as ComplexityScore,
      reasoning: row.reasoning,
      expectedBenefits: row.expectedBenefits,
      dependencies: JSON.parse(row.dependenciesJson),
      implementationSteps: JSON.parse(row.implementationStepsJson),
      evidence: row.evidence || undefined,
      risks: row.risksJson ? JSON.parse(row.risksJson) : [],
      acceptanceCriteria: row.acceptanceCriteriaJson ? JSON.parse(row.acceptanceCriteriaJson) : [],
      suggestedDiffSnippet: row.suggestedDiffSnippet || undefined,
      status: row.status as RecommendationStatus,
      createdAt: row.createdAt
    }));
  }

  listRecommendationsByStatus(
    projectId: string,
    status: RecommendationStatus
  ): AIRecommendation[] {
    const rows = this.db
      .select()
      .from(aiRecommendations)
      .where(
        and(
          eq(aiRecommendations.projectId, projectId),
          eq(
            aiRecommendations.status,
            status as typeof aiRecommendations.$inferSelect['status']
          )
        )
      )
      .orderBy(desc(aiRecommendations.createdAt))
      .all();

    return rows.map((row) => ({
      id: row.id,
      analysisId: row.analysisId,
      projectId: row.projectId,
      title: row.title,
      category: row.category as FactCategory,
      severity: row.severity as SeverityLevel,
      complexity: row.complexity as ComplexityScore,
      reasoning: row.reasoning,
      expectedBenefits: row.expectedBenefits,
      dependencies: JSON.parse(row.dependenciesJson),
      implementationSteps: JSON.parse(row.implementationStepsJson),
      evidence: row.evidence || undefined,
      risks: row.risksJson ? JSON.parse(row.risksJson) : [],
      acceptanceCriteria: row.acceptanceCriteriaJson ? JSON.parse(row.acceptanceCriteriaJson) : [],
      suggestedDiffSnippet: row.suggestedDiffSnippet || undefined,
      status: row.status as RecommendationStatus,
      createdAt: row.createdAt
    }));
  }

  updateRecommendationStatus(id: string, status: RecommendationStatus): boolean {
    const result = this.db
      .update(aiRecommendations)
      .set({ status: status as typeof aiRecommendations.$inferInsert['status'] })
      .where(eq(aiRecommendations.id, id))
      .run();

    return result.changes > 0;
  }

  saveCrossProjectInsight(params: {
    title: string;
    type: 'SHARED_PACKAGE' | 'REUSABLE_MODULE' | 'ARCHITECTURE_SIMILARITY' | 'DEPENDENCY_OVERLAP' | 'INTEGRATION_OPPORTUNITY';
    projectIds: string[];
    description: string;
    recommendation: string;
    licensingNotes?: string;
  }): CrossProjectInsight {
    const id = crypto.randomUUID();
    const now = new Date();

    this.db
      .insert(crossProjectInsights)
      .values({
        id,
        title: params.title,
        type: params.type,
        projectIdsJson: JSON.stringify(params.projectIds),
        description: params.description,
        recommendation: params.recommendation,
        licensingNotes: params.licensingNotes || null,
        createdAt: now
      })
      .run();

    return {
      id,
      title: params.title,
      type: params.type,
      projectIds: params.projectIds,
      description: params.description,
      recommendation: params.recommendation,
      licensingNotes: params.licensingNotes,
      createdAt: now
    };
  }

  listCrossProjectInsights(): CrossProjectInsight[] {
    const rows = this.db
      .select()
      .from(crossProjectInsights)
      .orderBy(desc(crossProjectInsights.createdAt))
      .all();

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type as CrossProjectInsight['type'],
      projectIds: JSON.parse(r.projectIdsJson),
      description: r.description,
      recommendation: r.recommendation,
      licensingNotes: r.licensingNotes || undefined,
      createdAt: r.createdAt
    }));
  }
}
