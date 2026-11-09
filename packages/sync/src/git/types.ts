export interface GitExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  command: string;
}

export interface FileStatus {
  path: string;
  indexStatus: string;
  workingTreeStatus: string;
}

export interface ParsedGitStatus {
  isClean: boolean;
  branch: string;
  trackingBranch: string | null;
  ahead: number;
  behind: number;
  staged: FileStatus[];
  unstaged: FileStatus[];
  untracked: string[];
  conflicted: string[];
}

export interface RemoteTrackingStatus {
  branch: string;
  trackingBranch: string | null;
  ahead: number;
  behind: number;
  isDiverged: boolean;
  isInSync: boolean;
  hasRemote: boolean;
}

export interface GitDiffSummary {
  filesChanged: number;
  insertions: number;
  deletions: number;
  rawDiff: string;
}
