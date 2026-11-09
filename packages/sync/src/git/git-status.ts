import type { GitCLI } from './git-cli.js';
import type { ParsedGitStatus, RemoteTrackingStatus, FileStatus } from './types.js';

export class GitStatusInspector {
  constructor(private git: GitCLI) {}

  /**
   * Inspects repository status using porcelain v2 format.
   */
  async getStatus(cwd?: string): Promise<ParsedGitStatus> {
    const res = await this.git.exec(['status', '--porcelain=v2', '--branch'], cwd);
    if (res.exitCode !== 0) {
      throw new Error(`Failed to get git status: ${res.stderr}`);
    }

    let branch = 'HEAD';
    let trackingBranch: string | null = null;
    let ahead = 0;
    let behind = 0;

    const staged: FileStatus[] = [];
    const unstaged: FileStatus[] = [];
    const untracked: string[] = [];
    const conflicted: string[] = [];

    const lines = res.stdout.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.startsWith('# branch.head ')) {
        branch = line.replace('# branch.head ', '').trim();
      } else if (line.startsWith('# branch.upstream ')) {
        trackingBranch = line.replace('# branch.upstream ', '').trim();
      } else if (line.startsWith('# branch.ab ')) {
        const parts = line.replace('# branch.ab ', '').split(' ');
        for (const part of parts) {
          if (part.startsWith('+')) {
            ahead = parseInt(part.substring(1), 10) || 0;
          } else if (part.startsWith('-')) {
            behind = parseInt(part.substring(1), 10) || 0;
          }
        }
      } else if (line.startsWith('1 ') || line.startsWith('2 ')) {
        // Tracked entry
        const parts = line.split(' ');
        const xy = parts[1];
        const filePath = parts.slice(8).join(' '); // Handles spaces in filename

        const indexStatus = xy[0];
        const workingTreeStatus = xy[1];

        if (indexStatus !== '.') {
          staged.push({ path: filePath, indexStatus, workingTreeStatus: '.' });
        }
        if (workingTreeStatus !== '.') {
          unstaged.push({ path: filePath, indexStatus: '.', workingTreeStatus });
        }
      } else if (line.startsWith('u ')) {
        // Unmerged / conflict
        const parts = line.split(' ');
        const filePath = parts.slice(10).join(' ');
        conflicted.push(filePath);
      } else if (line.startsWith('? ')) {
        // Untracked
        const filePath = line.substring(2).trim();
        untracked.push(filePath);
      }
    }

    const isClean = staged.length === 0 && unstaged.length === 0 && untracked.length === 0 && conflicted.length === 0;

    return {
      isClean,
      branch,
      trackingBranch,
      ahead,
      behind,
      staged,
      unstaged,
      untracked,
      conflicted
    };
  }

  /**
   * Fetches the tracking status relative to the upstream remote.
   */
  async getRemoteTrackingStatus(cwd?: string): Promise<RemoteTrackingStatus> {
    const status = await this.getStatus(cwd);
    const hasRemote = status.trackingBranch !== null;
    const isDiverged = status.ahead > 0 && status.behind > 0;
    const isInSync = status.ahead === 0 && status.behind === 0 && hasRemote;

    return {
      branch: status.branch,
      trackingBranch: status.trackingBranch,
      ahead: status.ahead,
      behind: status.behind,
      isDiverged,
      isInSync,
      hasRemote
    };
  }
}
