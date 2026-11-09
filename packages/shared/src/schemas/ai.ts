import { z } from 'zod';

export const FactCategorySchema = z.enum(['VERIFIED_FACT', 'AI_HYPOTHESIS']);
export type FactCategory = z.infer<typeof FactCategorySchema>;

export const SeverityLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type SeverityLevel = z.infer<typeof SeverityLevelSchema>;

export const ComplexityScoreSchema = z.enum(['XS', 'S', 'M', 'L', 'XL']);
export type ComplexityScore = z.infer<typeof ComplexityScoreSchema>;

export const RecommendationStatusSchema = z.enum([
  'PENDING',
  'PROPOSED',
  'ACCEPTED',
  'REJECTED',
  'RESOLVED',
  'IMPLEMENTED',
  'DEFERRED'
]);
export type RecommendationStatus = z.infer<typeof RecommendationStatusSchema>;

export const EvidenceRefSchema = z.object({
  type: z.enum(['FILE', 'AST_SYMBOL', 'COMMIT', 'MANIFEST', 'TEST', 'GENERAL']),
  path: z.string().optional(),
  lineStart: z.number().int().positive().optional(),
  lineEnd: z.number().int().positive().optional(),
  commitSha: z.string().optional(),
  symbolName: z.string().optional(),
  details: z.string().min(1)
});
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

export const TokenUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  estimatedCostUsd: z.number().nonnegative().optional()
});
export type TokenUsage = z.infer<typeof TokenUsageSchema>;

export const AIRecommendationSchema = z.object({
  id: z.string().uuid(),
  analysisId: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255),
  category: FactCategorySchema,
  severity: SeverityLevelSchema,
  complexity: ComplexityScoreSchema,
  reasoning: z.string().min(1),
  evidence: z.union([z.string(), z.array(EvidenceRefSchema)]).optional(),
  expectedBenefits: z.string().min(1),
  dependencies: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  implementationSteps: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(z.string()).default([]),
  suggestedDiffSnippet: z.string().optional(),
  status: RecommendationStatusSchema.default('PROPOSED'),
  createdAt: z.date()
});
export type AIRecommendation = z.infer<typeof AIRecommendationSchema>;

export const AIAnalysisSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  modelUsed: z.string().min(1),
  commitSha: z.string().optional(),
  promptVersion: z.string().optional(),
  summaryMarkdown: z.string().min(1),
  techDebtReport: z.string().min(1),
  securityReport: z.string().min(1),
  recommendations: z.array(AIRecommendationSchema).default([]),
  tokenUsage: TokenUsageSchema.optional(),
  createdAt: z.date()
});
export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;

export const AIRoadmapItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  complexity: ComplexityScoreSchema,
  category: FactCategorySchema,
  dependencies: z.array(z.string())
});
export type AIRoadmapItem = z.infer<typeof AIRoadmapItemSchema>;

export const AIRoadmapMilestoneSchema = z.object({
  phase: z.number().int().positive(),
  name: z.string(),
  items: z.array(AIRoadmapItemSchema)
});
export type AIRoadmapMilestone = z.infer<typeof AIRoadmapMilestoneSchema>;

export const AIRoadmapSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string().min(1),
  milestones: z.array(AIRoadmapMilestoneSchema),
  generatedAt: z.date()
});
export type AIRoadmap = z.infer<typeof AIRoadmapSchema>;

export const ProjectMemorySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  commitSha: z.string().optional(),
  purpose: z.string().min(1),
  architecture: z.string().min(1),
  implementedFeatures: z.array(z.string()),
  historicalDecisions: z.array(z.string()),
  knownLimitations: z.array(z.string()),
  currentState: z.string().min(1),
  futureOpportunities: z.array(z.string()),
  updatedAt: z.date()
});
export type ProjectMemory = z.infer<typeof ProjectMemorySchema>;

export const CrossProjectInsightSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  type: z.enum([
    'SHARED_PACKAGE',
    'REUSABLE_MODULE',
    'ARCHITECTURE_SIMILARITY',
    'DEPENDENCY_OVERLAP',
    'INTEGRATION_OPPORTUNITY'
  ]),
  projectIds: z.array(z.string().uuid()).min(2),
  description: z.string().min(1),
  recommendation: z.string().min(1),
  licensingNotes: z.string().optional(),
  createdAt: z.date()
});
export type CrossProjectInsight = z.infer<typeof CrossProjectInsightSchema>;
