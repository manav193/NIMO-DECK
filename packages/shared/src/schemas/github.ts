import { z } from 'zod';

export const GitHubRepoSchema = z.object({
  id: z.number(),
  name: z.string(),
  fullName: z.string(),
  owner: z.string(),
  description: z.string().nullable(),
  htmlUrl: z.string().url(),
  cloneUrl: z.string(),
  sshUrl: z.string().optional(),
  defaultBranch: z.string(),
  isPrivate: z.boolean(),
  isFork: z.boolean(),
  starsCount: z.number().int().nonnegative(),
  forksCount: z.number().int().nonnegative(),
  openIssuesCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
  pushedAt: z.string().datetime().nullable()
});
export type GitHubRepo = z.infer<typeof GitHubRepoSchema>;

export const GitHubBranchSchema = z.object({
  name: z.string(),
  commitSha: z.string().length(40),
  isProtected: z.boolean()
});
export type GitHubBranch = z.infer<typeof GitHubBranchSchema>;

export const GitHubPullRequestSchema = z.object({
  id: z.number(),
  number: z.number().int().positive(),
  title: z.string(),
  state: z.enum(['open', 'closed']),
  author: z.string(),
  htmlUrl: z.string().url(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  mergedAt: z.string().datetime().nullable().optional(),
  isDraft: z.boolean().default(false)
});
export type GitHubPullRequest = z.infer<typeof GitHubPullRequestSchema>;

export const GitHubIssueSchema = z.object({
  id: z.number(),
  number: z.number().int().positive(),
  title: z.string(),
  state: z.enum(['open', 'closed']),
  author: z.string(),
  htmlUrl: z.string().url(),
  labels: z.array(z.string()).default([]),
  commentsCount: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type GitHubIssue = z.infer<typeof GitHubIssueSchema>;

export const MappedRepoPairSchema = z.object({
  projectId: z.string().uuid(),
  projectName: z.string(),
  localPath: z.string(),
  gitRemoteUrl: z.string(),
  remoteRepo: GitHubRepoSchema.optional(),
  hasLocalPendingChanges: z.boolean().default(false),
  isInactive: z.boolean().default(false), // e.g. no activity in > 60 days
  daysSinceLastActivity: z.number().int().nonnegative().optional()
});
export type MappedRepoPair = z.infer<typeof MappedRepoPairSchema>;

export const RepositoryInventorySchema = z.object({
  localOnlyProjects: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    localPath: z.string()
  })),
  remoteOnlyRepos: z.array(GitHubRepoSchema),
  mappedRepositories: z.array(MappedRepoPairSchema),
  summary: z.object({
    totalLocal: z.number().int().nonnegative(),
    totalRemote: z.number().int().nonnegative(),
    totalMapped: z.number().int().nonnegative(),
    totalLocalOnly: z.number().int().nonnegative(),
    totalRemoteOnly: z.number().int().nonnegative(),
    totalOpenIssues: z.number().int().nonnegative(),
    totalOpenPRs: z.number().int().nonnegative()
  }),
  generatedAt: z.string().datetime()
});
export type RepositoryInventory = z.infer<typeof RepositoryInventorySchema>;
