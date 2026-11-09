import type { ProjectMemoryRepository } from '@nimo-deck/core';
import type { AIAnalysis, ProjectMemory } from '@nimo-deck/shared';
import type { ProjectIngestionContext } from '../ingestion/types.js';

export class ProjectMemoryManager {
  constructor(private memoryRepo: ProjectMemoryRepository) {}

  /**
   * Synthesizes and updates persistent project memory based on ingestion context,
   * previous memory state, and latest cognitive analysis.
   */
  async updateMemory(
    context: ProjectIngestionContext,
    analysis: AIAnalysis,
    commitSha?: string
  ): Promise<ProjectMemory> {
    const existing = this.memoryRepo.getMemoryByProject(context.projectId);

    // Extract purpose from README or summary
    const purpose =
      existing?.purpose ||
      context.documentation.find((d) => d.path.toLowerCase().includes('readme'))?.content.slice(0, 300) ||
      `${context.projectName} codebase repository.`;

    // Extract features from exports, package dependencies, and recent recommendations
    const newFeatures = context.astSummaries
      .flatMap((a) => a.exports)
      .slice(0, 20);

    const mergedFeatures = Array.from(
      new Set([...(existing?.implementedFeatures || []), ...newFeatures])
    );

    // Extract decisions from git commit titles
    const recentDecisions = context.recentCommits
      .map((c) => c.message.split('\n')[0])
      .filter((m) => m.startsWith('feat') || m.startsWith('refactor') || m.startsWith('fix'))
      .slice(0, 10);

    const mergedDecisions = Array.from(
      new Set([...(existing?.historicalDecisions || []), ...recentDecisions])
    );

    // Limitations from tech debt & security reports
    const limitations = [
      ...analysis.techDebtReport.split('\n').filter((l) => l.trim().startsWith('-')).map((l) => l.replace(/^-\s*/, '')),
      ...(existing?.knownLimitations || [])
    ].slice(0, 15);

    // Future opportunities from proposed recommendations
    const opportunities = analysis.recommendations.map((r) => r.title);
    const mergedOpportunities = Array.from(
      new Set([...(existing?.futureOpportunities || []), ...opportunities])
    ).slice(0, 20);

    const currentState = `Analyzed commit ${commitSha?.slice(0, 7) || 'HEAD'} across ${context.totalFilesScanned} files. Architecture: ${analysis.summaryMarkdown.slice(0, 200)}...`;

    return this.memoryRepo.upsertMemory({
      projectId: context.projectId,
      commitSha,
      purpose,
      architecture: analysis.summaryMarkdown,
      implementedFeatures: mergedFeatures,
      historicalDecisions: mergedDecisions,
      knownLimitations: limitations,
      currentState,
      futureOpportunities: mergedOpportunities
    });
  }

  getMemory(projectId: string): ProjectMemory | null {
    return this.memoryRepo.getMemoryByProject(projectId);
  }
}
