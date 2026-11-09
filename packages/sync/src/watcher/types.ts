export type MutationType = 'add' | 'change' | 'unlink';

export interface FileMutationEvent {
  path: string;
  type: MutationType;
  timestamp: number;
}

export interface ChangeBatch {
  repoPath: string;
  events: FileMutationEvent[];
  paths: string[];
  firstEventTimestamp: number;
  lastEventTimestamp: number;
}
