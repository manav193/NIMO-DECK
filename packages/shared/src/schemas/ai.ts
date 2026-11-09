import { z } from 'zod';

export const FactCategorySchema = z.enum(['VERIFIED_FACT', 'AI_HYPOTHESIS']);
export type FactCategory = z.infer<typeof FactCategorySchema>;

export const SeverityLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type SeverityLevel = z.infer<typeof SeverityLevelSchema>;

export const ComplexityScoreSchema = z.enum(['XS', 'S', 'M', 'L', 'XL']);
export type ComplexityScore = z.infer<typeof ComplexityScoreSchema>;

export const RecommendationStatusSchema = z.enum(['PROPOSED', 'ACCEPTED', 'REJECTED', 'RESOLVED']);
export type RecommendationStatus = z.infer<typeof RecommendationStatusSchema>;

export const AIRecommendationSchema = z.object({
  id: z.string().uuid(),
  analysisId: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255),
  category: FactCategorySchema,
  severity: SeverityLevelSchema,
  complexity: ComplexityScoreSchema,
  reasoning: z.string().min(1),
  expectedBenefits: z.string().min(1),
  dependencies: z.array(z.string()),
  implementationSteps: z.array(z.string()),
  suggestedDiffSnippet: z.string().optional(),
  status: RecommendationStatusSchema.default('PROPOSED'),
  createdAt: z.date()
});
export type AIRecommendation = z.infer<typeof AIRecommendationSchema>;

export const AIAnalysisSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  modelUsed: z.string().min(1),
  summaryMarkdown: z.string().min(1),
  techDebtReport: z.string().min(1),
  securityReport: z.string().min(1),
  recommendations: z.array(AIRecommendationSchema).default([]),
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
