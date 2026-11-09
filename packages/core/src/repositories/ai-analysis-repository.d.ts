import type { DeckDatabase } from '../database/connection.js';
import type { AIAnalysis, AIRecommendation, RecommendationStatus, FactCategory, SeverityLevel, ComplexityScore } from '@nimo-deck/shared';
export declare class AIAnalysisRepository {
    private db;
    constructor(db: DeckDatabase);
    saveAnalysis(params: {
        projectId: string;
        modelUsed: string;
        summaryMarkdown: string;
        techDebtReport: string;
        securityReport: string;
    }): AIAnalysis;
    getLatestAnalysis(projectId: string): AIAnalysis | null;
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
    }): AIRecommendation;
    listRecommendationsByProject(projectId: string): AIRecommendation[];
    listRecommendationsByAnalysis(analysisId: string): AIRecommendation[];
    updateRecommendationStatus(id: string, status: RecommendationStatus): boolean;
}
//# sourceMappingURL=ai-analysis-repository.d.ts.map