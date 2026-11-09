import { z } from 'zod';
import type {
  AIAnalysis,
  AIRoadmap,
  FactCategory,
  SeverityLevel,
  ComplexityScore,
  AIRecommendation
} from '@nimo-deck/shared';
import {
  FactCategorySchema,
  SeverityLevelSchema,
  ComplexityScoreSchema
} from '@nimo-deck/shared';
import type { ProviderRegistry } from '../providers/provider-registry.js';
import type { ProjectIngestionContext } from '../ingestion/types.js';
import { ContextPacker } from '../ingestion/context-packer.js';
import { FactHypothesisEngine } from './fact-hypothesis-engine.js';
import crypto from 'node:crypto';

const RawRecommendationSchema = z.object({
  title: z.string().min(1),
  category: FactCategorySchema,
  severity: SeverityLevelSchema,
  complexity: ComplexityScoreSchema,
  reasoning: z.string().min(1),
  evidence: z.string().optional(),
  expectedBenefits: z.string().min(1),
  dependencies: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  implementationSteps: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(z.string()).default([]),
  suggestedDiffSnippet: z.string().optional()
});

const RawAnalysisOutputSchema = z.object({
  summaryMarkdown: z.string().min(1),
  techDebtReport: z.string().min(1),
  securityReport: z.string().min(1),
  recommendations: z.array(RawRecommendationSchema).min(1),
  roadmapMilestones: z.array(
    z.object({
      phase: z.number().int().positive(),
      name: z.string().min(1),
      items: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          complexity: ComplexityScoreSchema,
          category: FactCategorySchema,
          dependencies: z.array(z.string()).default([])
        })
      )
    })
  ).default([])
});

export class RecommendationGenerator {
  constructor(private registry: ProviderRegistry) {}

  /**
   * Prompts the AI Provider to perform comprehensive repository intelligence
   * and returns validated analysis, recommendations, and roadmap.
   */
  async generateAnalysis(
    context: ProjectIngestionContext,
    options?: { model?: string; commitSha?: string }
  ): Promise<{
    analysis: AIAnalysis;
    roadmap: AIRoadmap;
    demotedCount: number;
    provider: string;
  }> {
    const packedContext = ContextPacker.pack(context);

    const prompt = `You are NIMO-DECK Technical Architect and Senior Code Auditor.
Analyze the following project context and produce a structured evaluation.

${packedContext}

CRITICAL RULES:
1. Distinguish strictly between VERIFIED_FACT and AI_HYPOTHESIS.
   - If an item is a VERIFIED_FACT, it MUST cite verifiable evidence (e.g. specific file path, line range, AST symbol, or manifest package).
   - If it is a recommendation, forecast, or inference, classify it as AI_HYPOTHESIS.
2. Provide a detailed summaryMarkdown covering architecture, runtime, and primary design patterns.
3. Provide a techDebtReport detailing complexity, missing tests, and outdated dependencies.
4. Provide a securityReport detailing attack surfaces, dependency risks, and secret exposure risks.
5. Provide actionable recommendations with explicit risks, implementation steps, and acceptance criteria.
6. Provide a phase-wise development roadmap.`;

    const structured = await this.registry.generateStructured(
      prompt,
      RawAnalysisOutputSchema,
      { model: options?.model }
    );

    const analysisId = crypto.randomUUID();
    const now = new Date();

    const rawRecs: AIRecommendation[] = structured.data.recommendations.map((r) => ({
      id: crypto.randomUUID(),
      analysisId,
      projectId: context.projectId,
      title: r.title,
      category: r.category as FactCategory,
      severity: r.severity as SeverityLevel,
      complexity: r.complexity as ComplexityScore,
      reasoning: r.reasoning,
      evidence: r.evidence,
      expectedBenefits: r.expectedBenefits,
      dependencies: r.dependencies || [],
      risks: r.risks || [],
      implementationSteps: r.implementationSteps || [],
      acceptanceCriteria: r.acceptanceCriteria || [],
      suggestedDiffSnippet: r.suggestedDiffSnippet,
      status: 'PENDING' as const,
      createdAt: now
    }));

    // Ground and validate facts vs hypotheses
    const { grounded, demotedCount } = FactHypothesisEngine.validateAndGround(rawRecs, context);

    const analysis: AIAnalysis = {
      id: analysisId,
      projectId: context.projectId,
      modelUsed: structured.model,
      commitSha: options?.commitSha,
      promptVersion: 'v1.0',
      summaryMarkdown: structured.data.summaryMarkdown,
      techDebtReport: structured.data.techDebtReport,
      securityReport: structured.data.securityReport,
      recommendations: grounded,
      tokenUsage: structured.usage,
      createdAt: now
    };

    const roadmap: AIRoadmap = {
      id: crypto.randomUUID(),
      projectId: context.projectId,
      title: `${context.projectName} Development Roadmap`,
      milestones: (structured.data.roadmapMilestones || []).map((m) => ({
        phase: m.phase,
        name: m.name,
        items: (m.items || []).map((item) => ({
          id: item.id,
          title: item.title,
          complexity: item.complexity as ComplexityScore,
          category: item.category as FactCategory,
          dependencies: item.dependencies || []
        }))
      })),
      generatedAt: now
    };

    return {
      analysis,
      roadmap,
      demotedCount,
      provider: structured.provider
    };
  }
}
