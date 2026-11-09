export interface GeneratedCommitMessage {
  title: string;
  body?: string;
  type: string;
  scope?: string;
}

export interface AICommitMessageGenerator {
  generate(params: {
    stagedFiles: string[];
    diffSummary: string;
    diffSnippet: string;
  }): Promise<GeneratedCommitMessage | null>;
}
