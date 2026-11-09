import type { AIRecommendation } from '@nimo-deck/shared';
import type { ProjectIngestionContext } from '../ingestion/types.js';

export class FactHypothesisEngine {
  /**
   * Validates and enforces strict fact-vs-hypothesis separation.
   * If a recommendation is marked as VERIFIED_FACT, verifies whether its evidence
   * points to an actual file on disk, an AST symbol, a manifest dependency, or a commit SHA.
   * If unverifiable, demotes it to AI_HYPOTHESIS to prevent hallucinated assumptions
   * from posing as verified facts.
   */
  static validateAndGround(
    recommendations: AIRecommendation[],
    context: ProjectIngestionContext
  ): {
    grounded: AIRecommendation[];
    demotedCount: number;
  } {
    const validPaths = new Set(context.topology);
    const validSymbols = new Set(
      context.astSummaries.flatMap((ast) => ast.symbols.map((s) => s.name))
    );
    const validDependencies = new Set(
      context.manifests.flatMap((m) => [
        ...Object.keys(m.dependencies),
        ...Object.keys(m.devDependencies)
      ])
    );
    const validCommits = new Set(context.recentCommits.map((c) => c.sha));

    let demotedCount = 0;

    const grounded = recommendations.map((rec) => {
      if (rec.category !== 'VERIFIED_FACT') {
        return rec;
      }

      // Check evidence
      const evStr = typeof rec.evidence === 'string' ? rec.evidence : JSON.stringify(rec.evidence || '');
      const evidenceMatches =
        Array.from(validPaths).some((p) => evStr.includes(p)) ||
        Array.from(validSymbols).some((s) => evStr.includes(s)) ||
        Array.from(validDependencies).some((d) => evStr.includes(d)) ||
        Array.from(validCommits).some((c) => evStr.includes(c.slice(0, 7)));

      if (!evidenceMatches || !rec.evidence || rec.evidence.length === 0) {
        demotedCount++;
        return {
          ...rec,
          category: 'AI_HYPOTHESIS' as const,
          reasoning: `[DEMOTED TO AI_HYPOTHESIS: Unverified factual claim lacking verifiable evidence on disk] ${rec.reasoning}`
        };
      }

      return rec;
    });

    return { grounded, demotedCount };
  }
}
