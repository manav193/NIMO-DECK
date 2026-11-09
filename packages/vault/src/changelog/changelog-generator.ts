import crypto from 'node:crypto';
import type { CommitRecord, ChangelogRecord } from '@nimo-deck/shared';
import type { VaultRepository } from '@nimo-deck/core';
import type { AIProviderAdapter } from '@nimo-deck/intelligence';

export interface GenerateChangelogOptions {
  projectId: string;
  version: string;
  title: string;
  commits: CommitRecord[];
  aiProvider?: AIProviderAdapter;
}

export class ChangelogGenerator {
  constructor(private vaultRepo?: VaultRepository) {}

  /**
   * Generates a grounded release changelog categorizing commits into semantic groups
   * and synthesizing architectural narratives with explicit AI interpretation tagging.
   */
  async generateChangelog(options: GenerateChangelogOptions): Promise<ChangelogRecord> {
    const features: string[] = [];
    const fixes: string[] = [];
    const breakingChanges: string[] = [];
    const refactors: string[] = [];
    const other: string[] = [];

    for (const c of options.commits) {
      const msg = c.message.trim();
      const firstLine = msg.split('\n')[0];
      const entry = `${firstLine} (${c.commitSha.slice(0, 7)}) by ${c.authorName}`;

      if (msg.includes('BREAKING CHANGE:') || /^[a-z]+!(\(.*\))?:/.test(firstLine)) {
        breakingChanges.push(entry);
      } else if (firstLine.startsWith('feat') || firstLine.startsWith('feat(')) {
        features.push(entry);
      } else if (firstLine.startsWith('fix') || firstLine.startsWith('fix(')) {
        fixes.push(entry);
      } else if (firstLine.startsWith('refactor') || firstLine.startsWith('refactor(')) {
        refactors.push(entry);
      } else {
        other.push(entry);
      }
    }

    let aiNarrative: string | undefined;

    if (options.aiProvider) {
      try {
        const prompt = `Synthesize a concise release narrative and architectural impact summary for version ${options.version} based on these commits:
${options.commits.map((c) => `- ${c.commitSha.slice(0, 7)}: ${c.message}`).join('\n')}

Output a 1-2 paragraph executive summary.`;

        const res = await options.aiProvider.generateText(prompt, { maxTokens: 500 });
        aiNarrative = res.text.trim();
      } catch {
        // Fallback gracefully without AI interpretation
      }
    }

    // Assemble markdown document with strict fact vs hypothesis labels
    const mdLines: string[] = [
      `# ${options.title} (${options.version})`,
      `*Generated on ${new Date().toISOString().split('T')[0]}*`,
      ''
    ];

    if (aiNarrative) {
      mdLines.push(
        '### 🤖 Executive Overview [AI_GENERATED_INTERPRETATION]',
        aiNarrative,
        ''
      );
    }

    if (breakingChanges.length > 0) {
      mdLines.push('### ⚠️ Breaking Changes [VERIFIED_GIT_HISTORY]', ...breakingChanges.map((b) => `- ${b}`), '');
    }

    if (features.length > 0) {
      mdLines.push('### 🚀 New Features [VERIFIED_GIT_HISTORY]', ...features.map((f) => `- ${f}`), '');
    }

    if (fixes.length > 0) {
      mdLines.push('### 🐛 Bug Fixes [VERIFIED_GIT_HISTORY]', ...fixes.map((f) => `- ${f}`), '');
    }

    if (refactors.length > 0) {
      mdLines.push('### 🛠️ Architecture & Refactoring [VERIFIED_GIT_HISTORY]', ...refactors.map((r) => `- ${r}`), '');
    }

    if (other.length > 0) {
      mdLines.push('### 📦 Additional Improvements [VERIFIED_GIT_HISTORY]', ...other.map((o) => `- ${o}`), '');
    }

    const markdown = mdLines.join('\n');
    const commitRange = options.commits.length > 0
      ? `${options.commits[options.commits.length - 1].commitSha.slice(0, 7)}..${options.commits[0].commitSha.slice(0, 7)}`
      : undefined;

    if (this.vaultRepo) {
      return this.vaultRepo.saveChangelog({
        projectId: options.projectId,
        version: options.version,
        title: options.title,
        markdown,
        commitRange,
        features,
        fixes,
        breakingChanges,
        aiNarrative
      });
    }

    return {
      id: crypto.randomUUID(),
      projectId: options.projectId,
      version: options.version,
      title: options.title,
      markdown,
      commitRange,
      features,
      fixes,
      breakingChanges,
      aiNarrative,
      generatedAt: new Date()
    };
  }
}
