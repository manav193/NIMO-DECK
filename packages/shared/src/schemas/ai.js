"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIRoadmapSchema = exports.AIRoadmapMilestoneSchema = exports.AIRoadmapItemSchema = exports.AIAnalysisSchema = exports.AIRecommendationSchema = exports.RecommendationStatusSchema = exports.ComplexityScoreSchema = exports.SeverityLevelSchema = exports.FactCategorySchema = void 0;
const zod_1 = require("zod");
exports.FactCategorySchema = zod_1.z.enum(['VERIFIED_FACT', 'AI_HYPOTHESIS']);
exports.SeverityLevelSchema = zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
exports.ComplexityScoreSchema = zod_1.z.enum(['XS', 'S', 'M', 'L', 'XL']);
exports.RecommendationStatusSchema = zod_1.z.enum(['PROPOSED', 'ACCEPTED', 'REJECTED', 'RESOLVED']);
exports.AIRecommendationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    analysisId: zod_1.z.string().uuid(),
    projectId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1).max(255),
    category: exports.FactCategorySchema,
    severity: exports.SeverityLevelSchema,
    complexity: exports.ComplexityScoreSchema,
    reasoning: zod_1.z.string().min(1),
    expectedBenefits: zod_1.z.string().min(1),
    dependencies: zod_1.z.array(zod_1.z.string()),
    implementationSteps: zod_1.z.array(zod_1.z.string()),
    suggestedDiffSnippet: zod_1.z.string().optional(),
    status: exports.RecommendationStatusSchema.default('PROPOSED'),
    createdAt: zod_1.z.date()
});
exports.AIAnalysisSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    projectId: zod_1.z.string().uuid(),
    modelUsed: zod_1.z.string().min(1),
    summaryMarkdown: zod_1.z.string().min(1),
    techDebtReport: zod_1.z.string().min(1),
    securityReport: zod_1.z.string().min(1),
    recommendations: zod_1.z.array(exports.AIRecommendationSchema).default([]),
    createdAt: zod_1.z.date()
});
exports.AIRoadmapItemSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    complexity: exports.ComplexityScoreSchema,
    category: exports.FactCategorySchema,
    dependencies: zod_1.z.array(zod_1.z.string())
});
exports.AIRoadmapMilestoneSchema = zod_1.z.object({
    phase: zod_1.z.number().int().positive(),
    name: zod_1.z.string(),
    items: zod_1.z.array(exports.AIRoadmapItemSchema)
});
exports.AIRoadmapSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    projectId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1),
    milestones: zod_1.z.array(exports.AIRoadmapMilestoneSchema),
    generatedAt: zod_1.z.date()
});
//# sourceMappingURL=ai.js.map