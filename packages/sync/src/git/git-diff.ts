import type { GitCLI } from './git-cli.js';
import type { GitDiffSummary } from './types.js';

export class GitDiffInspector {
  constructor(private git: GitCLI) {}

  /**
   * Retrieves diff summary for staged changes.
   */
  async getStagedDiffSummary(cwd?: string): Promise<GitDiffSummary> {
    const statRes = await this.git.exec(['diff', '--cached', '--stat'], cwd);
    const numstatRes = await this.git.exec(['diff', '--cached', '--numstat'], cwd);

    let filesChanged = 0;
    let insertions = 0;
    let deletions = 0;

    if (numstatRes.exitCode === 0 && numstatRes.stdout) {
      const lines = numstatRes.stdout.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          filesChanged++;
          insertions += parseInt(parts[0], 10) || 0;
          deletions += parseInt(parts[1], 10) || 0;
        }
      }
    }

    return {
      filesChanged,
      insertions,
      deletions,
      rawDiff: statRes.stdout
    };
  }

  /**
   * Retrieves full unified diff of staged changes, safely truncated to prevent prompt overflow.
   */
  async getStagedDiff(cwd?: string, maxChars = 20000): Promise<string> {
    const res = await this.git.exec(['diff', '--cached'], cwd);
    if (res.exitCode !== 0) {
      return '';
    }

    if (res.stdout.length > maxChars) {
      return res.stdout.substring(0, maxChars) + '\n... [Diff truncated by NIMO-DECK for context safety]';
    }

    return res.stdout;
  }
}
