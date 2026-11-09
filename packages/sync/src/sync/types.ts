import type { QuarantinedFile } from '../safety/types.js';

export interface SyncResult {
  success: boolean;
  projectId: string;
  repoPath: string;
  commitCreated: boolean;
  commitSha?: string;
  pushed: boolean;
  pulled: boolean;
  quarantinedFiles: QuarantinedFile[];
  error?: string;
  isDiverged?: boolean;
  durationMs: number;
}

export interface SyncStepEvent {
  step: 'PRE_SCAN' | 'STAGE' | 'COMMIT' | 'PULL' | 'PUSH' | 'COMPLETE';
  projectId: string;
  repoPath: string;
  details?: Record<string, unknown>;
}
