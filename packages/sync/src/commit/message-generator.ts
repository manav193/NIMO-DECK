import path from 'node:path';
import type { GeneratedCommitMessage, AICommitMessageGenerator } from './types.js';

export class ConventionalCommitBuilder {
  /**
   * Deterministically infers a Conventional Commit message based on staged file paths.
   */
  inferMessage(stagedFiles: string[]): GeneratedCommitMessage {
    if (stagedFiles.length === 0) {
      return {
        title: 'chore: update workspace files',
        type: 'chore'
      };
    }

    const first = stagedFiles[0];
    const ext = path.extname(first).toLowerCase();
    const basename = path.basename(first).toLowerCase();

    // 1. Documentation
    if (
      stagedFiles.every((f) => f.startsWith('docs/') || f.endsWith('.md') || f.endsWith('.txt'))
    ) {
      const scope = stagedFiles.length === 1 ? path.basename(first, ext) : undefined;
      return {
        type: 'docs',
        scope,
        title: scope ? `docs(${scope}): update documentation` : 'docs: update project documentation'
      };
    }

    // 2. Tests
    if (
      stagedFiles.every(
        (f) =>
          f.includes('test') ||
          f.includes('spec') ||
          f.endsWith('.test.ts') ||
          f.endsWith('.spec.js')
      )
    ) {
      return {
        type: 'test',
        title: 'test: update test specifications'
      };
    }

    // 3. Dependencies & Configurations
    if (
      stagedFiles.every(
        (f) =>
          basename === 'package.json' ||
          basename === 'package-lock.json' ||
          basename === 'cargo.toml' ||
          basename === 'tsconfig.json' ||
          f.startsWith('.github/')
      )
    ) {
      return {
        type: 'chore',
        scope: 'deps',
        title: 'chore(deps): update workspace configuration and dependencies'
      };
    }

    // 4. Extract scope from monorepo packages (e.g. packages/core/src/... -> core)
    let scope: string | undefined;
    for (const f of stagedFiles) {
      const match = f.match(/^packages\/([^/]+)/);
      if (match) {
        if (!scope) {
          scope = match[1];
        } else if (scope !== match[1]) {
          scope = undefined; // Multi-package edit
          break;
        }
      }
    }

    const type = 'feat';
    const fileCount = stagedFiles.length;
    const title = scope
      ? `feat(${scope}): update ${fileCount} file${fileCount > 1 ? 's' : ''}`
      : `feat: update ${fileCount} file${fileCount > 1 ? 's' : ''}`;

    const body = `Changed files:\n${stagedFiles.slice(0, 10).map((f) => `- ${f}`).join('\n')}${
      stagedFiles.length > 10 ? `\n... and ${stagedFiles.length - 10} more` : ''
    }\n\nSigned-off-by: NIMO-DECK Sync Engine <deck-sync@local>`;

    return {
      type,
      scope,
      title: title.slice(0, 72),
      body
    };
  }
}

export class CommitMessageService {
  private heuristicBuilder = new ConventionalCommitBuilder();

  constructor(private aiGenerator?: AICommitMessageGenerator) {}

  /**
   * Generates a commit message using AI if available, falling back to Conventional Commits heuristic.
   */
  async generateMessage(params: {
    stagedFiles: string[];
    diffSummary: string;
    diffSnippet: string;
  }): Promise<GeneratedCommitMessage> {
    if (this.aiGenerator) {
      try {
        const aiMessage = await this.aiGenerator.generate(params);
        if (aiMessage && aiMessage.title) {
          return aiMessage;
        }
      } catch {
        // AI failure: fall through gracefully to heuristic builder
      }
    }

    return this.heuristicBuilder.inferMessage(params.stagedFiles);
  }
}
