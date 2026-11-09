import { z } from 'zod';
export declare const FactCategorySchema: z.ZodEnum<["VERIFIED_FACT", "AI_HYPOTHESIS"]>;
export type FactCategory = z.infer<typeof FactCategorySchema>;
export declare const SeverityLevelSchema: z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>;
export type SeverityLevel = z.infer<typeof SeverityLevelSchema>;
export declare const ComplexityScoreSchema: z.ZodEnum<["XS", "S", "M", "L", "XL"]>;
export type ComplexityScore = z.infer<typeof ComplexityScoreSchema>;
export declare const RecommendationStatusSchema: z.ZodEnum<["PROPOSED", "ACCEPTED", "REJECTED", "RESOLVED"]>;
export type RecommendationStatus = z.infer<typeof RecommendationStatusSchema>;
export declare const AIRecommendationSchema: z.ZodObject<{
    id: z.ZodString;
    analysisId: z.ZodString;
    projectId: z.ZodString;
    title: z.ZodString;
    category: z.ZodEnum<["VERIFIED_FACT", "AI_HYPOTHESIS"]>;
    severity: z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>;
    complexity: z.ZodEnum<["XS", "S", "M", "L", "XL"]>;
    reasoning: z.ZodString;
    expectedBenefits: z.ZodString;
    dependencies: z.ZodArray<z.ZodString, "many">;
    implementationSteps: z.ZodArray<z.ZodString, "many">;
    suggestedDiffSnippet: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["PROPOSED", "ACCEPTED", "REJECTED", "RESOLVED"]>>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "PROPOSED" | "ACCEPTED" | "REJECTED" | "RESOLVED";
    createdAt: Date;
    projectId: string;
    analysisId: string;
    title: string;
    category: "VERIFIED_FACT" | "AI_HYPOTHESIS";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    complexity: "XS" | "S" | "M" | "L" | "XL";
    reasoning: string;
    expectedBenefits: string;
    dependencies: string[];
    implementationSteps: string[];
    suggestedDiffSnippet?: string | undefined;
}, {
    id: string;
    createdAt: Date;
    projectId: string;
    analysisId: string;
    title: string;
    category: "VERIFIED_FACT" | "AI_HYPOTHESIS";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    complexity: "XS" | "S" | "M" | "L" | "XL";
    reasoning: string;
    expectedBenefits: string;
    dependencies: string[];
    implementationSteps: string[];
    status?: "PROPOSED" | "ACCEPTED" | "REJECTED" | "RESOLVED" | undefined;
    suggestedDiffSnippet?: string | undefined;
}>;
export type AIRecommendation = z.infer<typeof AIRecommendationSchema>;
export declare const AIAnalysisSchema: z.ZodObject<{
    id: z.ZodString;
    projectId: z.ZodString;
    modelUsed: z.ZodString;
    summaryMarkdown: z.ZodString;
    techDebtReport: z.ZodString;
    securityReport: z.ZodString;
    recommendations: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        analysisId: z.ZodString;
        projectId: z.ZodString;
        title: z.ZodString;
        category: z.ZodEnum<["VERIFIED_FACT", "AI_HYPOTHESIS"]>;
        severity: z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>;
        complexity: z.ZodEnum<["XS", "S", "M", "L", "XL"]>;
        reasoning: z.ZodString;
        expectedBenefits: z.ZodString;
        dependencies: z.ZodArray<z.ZodString, "many">;
        implementationSteps: z.ZodArray<z.ZodString, "many">;
        suggestedDiffSnippet: z.ZodOptional<z.ZodString>;
        status: z.ZodDefault<z.ZodEnum<["PROPOSED", "ACCEPTED", "REJECTED", "RESOLVED"]>>;
        createdAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        status: "PROPOSED" | "ACCEPTED" | "REJECTED" | "RESOLVED";
        createdAt: Date;
        projectId: string;
        analysisId: string;
        title: string;
        category: "VERIFIED_FACT" | "AI_HYPOTHESIS";
        severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        complexity: "XS" | "S" | "M" | "L" | "XL";
        reasoning: string;
        expectedBenefits: string;
        dependencies: string[];
        implementationSteps: string[];
        suggestedDiffSnippet?: string | undefined;
    }, {
        id: string;
        createdAt: Date;
        projectId: string;
        analysisId: string;
        title: string;
        category: "VERIFIED_FACT" | "AI_HYPOTHESIS";
        severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        complexity: "XS" | "S" | "M" | "L" | "XL";
        reasoning: string;
        expectedBenefits: string;
        dependencies: string[];
        implementationSteps: string[];
        status?: "PROPOSED" | "ACCEPTED" | "REJECTED" | "RESOLVED" | undefined;
        suggestedDiffSnippet?: string | undefined;
    }>, "many">>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    projectId: string;
    modelUsed: string;
    summaryMarkdown: string;
    techDebtReport: string;
    securityReport: string;
    recommendations: {
        id: string;
        status: "PROPOSED" | "ACCEPTED" | "REJECTED" | "RESOLVED";
        createdAt: Date;
        projectId: string;
        analysisId: string;
        title: string;
        category: "VERIFIED_FACT" | "AI_HYPOTHESIS";
        severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        complexity: "XS" | "S" | "M" | "L" | "XL";
        reasoning: string;
        expectedBenefits: string;
        dependencies: string[];
        implementationSteps: string[];
        suggestedDiffSnippet?: string | undefined;
    }[];
}, {
    id: string;
    createdAt: Date;
    projectId: string;
    modelUsed: string;
    summaryMarkdown: string;
    techDebtReport: string;
    securityReport: string;
    recommendations?: {
        id: string;
        createdAt: Date;
        projectId: string;
        analysisId: string;
        title: string;
        category: "VERIFIED_FACT" | "AI_HYPOTHESIS";
        severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        complexity: "XS" | "S" | "M" | "L" | "XL";
        reasoning: string;
        expectedBenefits: string;
        dependencies: string[];
        implementationSteps: string[];
        status?: "PROPOSED" | "ACCEPTED" | "REJECTED" | "RESOLVED" | undefined;
        suggestedDiffSnippet?: string | undefined;
    }[] | undefined;
}>;
export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;
export declare const AIRoadmapItemSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    complexity: z.ZodEnum<["XS", "S", "M", "L", "XL"]>;
    category: z.ZodEnum<["VERIFIED_FACT", "AI_HYPOTHESIS"]>;
    dependencies: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    category: "VERIFIED_FACT" | "AI_HYPOTHESIS";
    complexity: "XS" | "S" | "M" | "L" | "XL";
    dependencies: string[];
}, {
    id: string;
    title: string;
    category: "VERIFIED_FACT" | "AI_HYPOTHESIS";
    complexity: "XS" | "S" | "M" | "L" | "XL";
    dependencies: string[];
}>;
export type AIRoadmapItem = z.infer<typeof AIRoadmapItemSchema>;
export declare const AIRoadmapMilestoneSchema: z.ZodObject<{
    phase: z.ZodNumber;
    name: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        complexity: z.ZodEnum<["XS", "S", "M", "L", "XL"]>;
        category: z.ZodEnum<["VERIFIED_FACT", "AI_HYPOTHESIS"]>;
        dependencies: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        category: "VERIFIED_FACT" | "AI_HYPOTHESIS";
        complexity: "XS" | "S" | "M" | "L" | "XL";
        dependencies: string[];
    }, {
        id: string;
        title: string;
        category: "VERIFIED_FACT" | "AI_HYPOTHESIS";
        complexity: "XS" | "S" | "M" | "L" | "XL";
        dependencies: string[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    phase: number;
    items: {
        id: string;
        title: string;
        category: "VERIFIED_FACT" | "AI_HYPOTHESIS";
        complexity: "XS" | "S" | "M" | "L" | "XL";
        dependencies: string[];
    }[];
}, {
    name: string;
    phase: number;
    items: {
        id: string;
        title: string;
        category: "VERIFIED_FACT" | "AI_HYPOTHESIS";
        complexity: "XS" | "S" | "M" | "L" | "XL";
        dependencies: string[];
    }[];
}>;
export type AIRoadmapMilestone = z.infer<typeof AIRoadmapMilestoneSchema>;
export declare const AIRoadmapSchema: z.ZodObject<{
    id: z.ZodString;
    projectId: z.ZodString;
    title: z.ZodString;
    milestones: z.ZodArray<z.ZodObject<{
        phase: z.ZodNumber;
        name: z.ZodString;
        items: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            complexity: z.ZodEnum<["XS", "S", "M", "L", "XL"]>;
            category: z.ZodEnum<["VERIFIED_FACT", "AI_HYPOTHESIS"]>;
            dependencies: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            id: string;
            title: string;
            category: "VERIFIED_FACT" | "AI_HYPOTHESIS";
            complexity: "XS" | "S" | "M" | "L" | "XL";
            dependencies: string[];
        }, {
            id: string;
            title: string;
            category: "VERIFIED_FACT" | "AI_HYPOTHESIS";
            complexity: "XS" | "S" | "M" | "L" | "XL";
            dependencies: string[];
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        phase: number;
        items: {
            id: string;
            title: string;
            category: "VERIFIED_FACT" | "AI_HYPOTHESIS";
            complexity: "XS" | "S" | "M" | "L" | "XL";
            dependencies: string[];
        }[];
    }, {
        name: string;
        phase: number;
        items: {
            id: string;
            title: string;
            category: "VERIFIED_FACT" | "AI_HYPOTHESIS";
            complexity: "XS" | "S" | "M" | "L" | "XL";
            dependencies: string[];
        }[];
    }>, "many">;
    generatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    projectId: string;
    title: string;
    generatedAt: Date;
    milestones: {
        name: string;
        phase: number;
        items: {
            id: string;
            title: string;
            category: "VERIFIED_FACT" | "AI_HYPOTHESIS";
            complexity: "XS" | "S" | "M" | "L" | "XL";
            dependencies: string[];
        }[];
    }[];
}, {
    id: string;
    projectId: string;
    title: string;
    generatedAt: Date;
    milestones: {
        name: string;
        phase: number;
        items: {
            id: string;
            title: string;
            category: "VERIFIED_FACT" | "AI_HYPOTHESIS";
            complexity: "XS" | "S" | "M" | "L" | "XL";
            dependencies: string[];
        }[];
    }[];
}>;
export type AIRoadmap = z.infer<typeof AIRoadmapSchema>;
//# sourceMappingURL=ai.d.ts.map