import type { GitCommitSummary } from './types.js';

export class GitHistoryAnalyzer {
  /**
   * Summarizes git commit history to detect development velocity, recent churn hotspots,
   * and historical modifications.
   */
  static summarize(commits: GitCommitSummary[]): {
    totalCommits: number;
    activeAuthors: string[];
    frequentlyChangedFiles: Array<{ path: string; count: number }>;
    recentCommitTitles: string[];
  } {
    const authorCounts = new Map<string, number>();
    const fileChangeCounts = new Map<string, number>();
    const titles: string[] = [];

    for (const c of commits) {
      authorCounts.set(c.author, (authorCounts.get(c.author) || 0) + 1);
      titles.push(c.message.split('\n')[0]);

      for (const f of c.filesChanged) {
        fileChangeCounts.set(f, (fileChangeCounts.get(f) || 0) + 1);
      }
    }

    const sortedFiles = Array.from(fileChangeCounts.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const activeAuthors = Array.from(authorCounts.keys());

    return {
      totalCommits: commits.length,
      activeAuthors,
      frequentlyChangedFiles: sortedFiles,
      recentCommitTitles: titles.slice(0, 10)
    };
  }
}
