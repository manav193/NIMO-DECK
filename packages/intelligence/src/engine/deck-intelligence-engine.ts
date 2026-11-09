import path from 'node:path';
import type { DeckDatabase, DeckEventBus } from '@nimo-deck/core';
import { AIAnalysisRepository, ProjectMemoryRepository } from '@nimo-deck/core';
import type { AIAnalysis, AIRoadmap, CrossProjectInsight } from '@nimo-deck/shared';
import { sha256 } from '@nimo-deck/shared';
import { RepoScanner } from '../ingestion/repo-scanner.js';
import { ASTExtractor } from '../ingestion/ast-extractor.js';
import { ManifestAnalyzer } from '../ingestion/manifest-analyzer.js';
import { DocExtractor } from '../ingestion/doc-extractor.js';
import { TestStructureAnalyzer } from '../ingestion/test-structure-analyzer.js';
import { ContentHashCache } from '../ingestion/content-hash-cache.js';
import type { FileASTSummary, ProjectIngestionContext } from '../ingestion/types.js';
import { ProviderRegistry } from '../providers/provider-registry.js';
import { RecommendationGenerator } from '../analysis/recommendation-generator.js';
import { ProjectMemoryManager } from '../memory/project-memory-manager.js';
import { CrossProjectAnalyzer } from '../cross-project/cross-project-analyzer.js';
import { PrivacyGuard, type PrivacyPolicy } from '../security/privacy-guard.js';

export interface IntelligenceEngineConfig {
  db: DeckDatabase;
  registry: ProviderRegistry;
  eventBus?: DeckEventBus;
}

export interface AnalyzeProjectOptions {
  projectId: string;
  projectName?: string;
  projectPath: string;
  commitSha?: string;
  model?: string;
  policy?: PrivacyPolicy;
  forceFullScan?: boolean;
}

export class DeckIntelligenceEngine {
  private analysisRepo: AIAnalysisRepository;
  private memoryRepo: ProjectMemoryRepository;
  private memoryManager: ProjectMemoryManager;
  private generator: RecommendationGenerator;
  private contentCaches = new Map<string, ContentHashCache>(); // projectId -> ContentHashCache
  private astCaches = new Map<string, Map<string, FileASTSummary>>(); // projectId -> (filePath -> ASTSummary)

  constructor(private config: IntelligenceEngineConfig) {
    this.analysisRepo = new AIAnalysisRepository(config.db);
    this.memoryRepo = new ProjectMemoryRepository(config.db);
    this.memoryManager = new ProjectMemoryManager(this.memoryRepo);
    this.generator = new RecommendationGenerator(config.registry);
  }

  /**
   * Ingests a repository, utilizing incremental caching to avoid re-parsing unchanged files.
   */
  ingestProject(params: {
    projectId: string;
    projectName: string;
    projectRoot: string;
    forceFullScan?: boolean;
  }): { context: ProjectIngestionContext; incrementalChanges: boolean } {
    const files = RepoScanner.scan(params.projectRoot);

    // Incremental cache management
    let cache = this.contentCaches.get(params.projectId);
    if (!cache || params.forceFullScan) {
      cache = new ContentHashCache();
      this.contentCaches.set(params.projectId, cache);
    }

    const diff = cache.diff(files);
    cache.update(files);

    // Cached AST lookup & incremental update
    let projectAstMap = this.astCaches.get(params.projectId);
    if (!projectAstMap || params.forceFullScan) {
      projectAstMap = new Map<string, FileASTSummary>();
      this.astCaches.set(params.projectId, projectAstMap);
    }

    // Parse only added or modified TypeScript/JavaScript files
    const filesToParse = params.forceFullScan ? files : [...diff.added, ...diff.modified];
    for (const f of filesToParse) {
      if (f.extension === '.ts' || f.extension === '.tsx' || f.extension === '.js') {
        const ast = ASTExtractor.extractFromFile(f.fullPath, f.relativePath);
        projectAstMap.set(f.relativePath, ast);
      }
    }

    // Clean up deleted files from AST cache
    for (const del of diff.deleted) {
      projectAstMap.delete(del);
    }

    const allAstSummaries = Array.from(projectAstMap.values());
    const manifests = ManifestAnalyzer.analyze(files);
    const docs = DocExtractor.extract(files);
    const testStructure = TestStructureAnalyzer.analyze(files);
    const topology = files.map((f) => f.relativePath);

    // Deterministic overall content hash
    const combinedDigest = sha256(Buffer.from(files.map((f) => `${f.relativePath}:${f.sha256}`).join('\n')));

    const context: ProjectIngestionContext = {
      projectId: params.projectId,
      projectName: params.projectName,
      topology,
      manifests,
      documentation: docs,
      astSummaries: allAstSummaries,
      testStructure,
      recentCommits: [],
      totalFilesScanned: files.length,
      contentHash: combinedDigest
    };

    return { context, incrementalChanges: diff.hasChanges };
  }

  /**
   * Executes full cognitive analysis on a project.
   */
  async analyzeProject(options: AnalyzeProjectOptions): Promise<{
    analysis: AIAnalysis;
    roadmap: AIRoadmap;
    skippedAsUnchanged?: boolean;
    provider: string;
  }> {
    const policy: PrivacyPolicy = options.policy || {
      aiAnalysisEnabled: true,
      localOnly: false
    };

    // 1. Assert privacy and opt-in policies
    PrivacyGuard.assertAllowed(policy, this.config.registry.getProvider('openrouter')?.id || 'openrouter');

    const projectName = options.projectName || path.basename(options.projectPath);

    // 2. Ingest repository with incremental hashing
    const { context, incrementalChanges } = this.ingestProject({
      projectId: options.projectId,
      projectName,
      projectRoot: options.projectPath,
      forceFullScan: options.forceFullScan
    });

    // 3. Duplicate check: if content hash unchanged and previous analysis exists, skip
    const latestAnalysis = this.analysisRepo.getLatestAnalysis(options.projectId);
    if (!options.forceFullScan && !incrementalChanges && latestAnalysis) {
      return {
        analysis: latestAnalysis,
        roadmap: {
          id: latestAnalysis.id,
          projectId: options.projectId,
          title: `${projectName} Roadmap`,
          milestones: [],
          generatedAt: latestAnalysis.createdAt
        },
        skippedAsUnchanged: true,
        provider: latestAnalysis.modelUsed
      };
    }

    // 4. Generate AI analysis and recommendations
    const { analysis, roadmap, provider } = await this.generator.generateAnalysis(
      context,
      { model: options.model, commitSha: options.commitSha }
    );

    // 5. Persist analysis & recommendations to local SQLite database
    const saved = this.analysisRepo.saveAnalysis({
      projectId: context.projectId,
      modelUsed: analysis.modelUsed,
      summaryMarkdown: analysis.summaryMarkdown,
      techDebtReport: analysis.techDebtReport,
      securityReport: analysis.securityReport,
      commitSha: options.commitSha,
      promptVersion: analysis.promptVersion,
      tokenUsage: analysis.tokenUsage
    });

    for (const rec of analysis.recommendations) {
      this.analysisRepo.saveRecommendation({
        analysisId: saved.id,
        projectId: context.projectId,
        title: rec.title,
        category: rec.category,
        severity: rec.severity,
        complexity: rec.complexity,
        reasoning: rec.reasoning,
        expectedBenefits: rec.expectedBenefits,
        dependencies: rec.dependencies,
        implementationSteps: rec.implementationSteps,
        evidence: typeof rec.evidence === 'string' ? rec.evidence : undefined,
        risks: rec.risks,
        acceptanceCriteria: rec.acceptanceCriteria,
        suggestedDiffSnippet: rec.suggestedDiffSnippet,
        status: rec.status
      });
    }

    // 6. Update persistent project memory
    await this.memoryManager.updateMemory(context, analysis, options.commitSha);

    // 7. Emit events
    if (this.config.eventBus) {
      this.config.eventBus.emit('ai:analysis_completed', {
        ...saved,
        recommendations: analysis.recommendations
      });
    }

    return {
      analysis: {
        ...saved,
        recommendations: analysis.recommendations
      },
      roadmap,
      provider
    };
  }

  /**
   * Performs cross-project correlation across multiple project directories.
   */
  analyzeCrossProjects(
    projects: Array<{ projectId: string; projectName: string; projectPath: string }>
  ): CrossProjectInsight[] {
    const contexts = projects.map(
      (p) =>
        this.ingestProject({
          projectId: p.projectId,
          projectName: p.projectName,
          projectRoot: p.projectPath
        }).context
    );

    const insights = CrossProjectAnalyzer.analyze(contexts);

    // Save insights into database
    for (const insight of insights) {
      this.analysisRepo.saveCrossProjectInsight({
        title: insight.title,
        type: insight.type,
        projectIds: insight.projectIds,
        description: insight.description,
        recommendation: insight.recommendation,
        licensingNotes: insight.licensingNotes
      });
    }

    return insights;
  }

  getProjectMemory(projectId: string) {
    return this.memoryManager.getMemory(projectId);
  }

  getAnalysisRepo(): AIAnalysisRepository {
    return this.analysisRepo;
  }
}
