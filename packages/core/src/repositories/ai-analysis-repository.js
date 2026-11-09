"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAnalysisRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_js_1 = require("../database/schema.js");
const node_crypto_1 = __importDefault(require("node:crypto"));
class AIAnalysisRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    saveAnalysis(params) {
        const id = node_crypto_1.default.randomUUID();
        const now = new Date();
        const record = {
            id,
            projectId: params.projectId,
            modelUsed: params.modelUsed,
            summaryMarkdown: params.summaryMarkdown,
            techDebtReport: params.techDebtReport,
            securityReport: params.securityReport,
            createdAt: now
        };
        this.db.insert(schema_js_1.aiAnalyses).values(record).run();
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
    getLatestAnalysis(projectId) {
        const row = this.db
            .select()
            .from(schema_js_1.aiAnalyses)
            .where((0, drizzle_orm_1.eq)(schema_js_1.aiAnalyses.projectId, projectId))
            .orderBy((0, drizzle_orm_1.desc)(schema_js_1.aiAnalyses.createdAt))
            .limit(1)
            .get();
        if (!row)
            return null;
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
    saveRecommendation(params) {
        const id = node_crypto_1.default.randomUUID();
        const now = new Date();
        const record = {
            id,
            analysisId: params.analysisId,
            projectId: params.projectId,
            title: params.title,
            category: params.category,
            severity: params.severity,
            complexity: params.complexity,
            reasoning: params.reasoning,
            expectedBenefits: params.expectedBenefits,
            dependenciesJson: JSON.stringify(params.dependencies),
            implementationStepsJson: JSON.stringify(params.implementationSteps),
            suggestedDiffSnippet: params.suggestedDiffSnippet || null,
            status: 'PROPOSED',
            createdAt: now
        };
        this.db.insert(schema_js_1.aiRecommendations).values(record).run();
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
            dependencies: params.dependencies,
            implementationSteps: params.implementationSteps,
            suggestedDiffSnippet: params.suggestedDiffSnippet,
            status: 'PROPOSED',
            createdAt: now
        };
    }
    listRecommendationsByProject(projectId) {
        const rows = this.db
            .select()
            .from(schema_js_1.aiRecommendations)
            .where((0, drizzle_orm_1.eq)(schema_js_1.aiRecommendations.projectId, projectId))
            .orderBy((0, drizzle_orm_1.desc)(schema_js_1.aiRecommendations.createdAt))
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
    listRecommendationsByAnalysis(analysisId) {
        const rows = this.db
            .select()
            .from(schema_js_1.aiRecommendations)
            .where((0, drizzle_orm_1.eq)(schema_js_1.aiRecommendations.analysisId, analysisId))
            .orderBy((0, drizzle_orm_1.desc)(schema_js_1.aiRecommendations.createdAt))
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
    updateRecommendationStatus(id, status) {
        const result = this.db
            .update(schema_js_1.aiRecommendations)
            .set({ status: status })
            .where((0, drizzle_orm_1.eq)(schema_js_1.aiRecommendations.id, id))
            .run();
        return result.changes > 0;
    }
}
exports.AIAnalysisRepository = AIAnalysisRepository;
//# sourceMappingURL=ai-analysis-repository.js.map