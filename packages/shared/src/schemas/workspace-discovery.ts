import { z } from 'zod';

/**
 * Standard list of non-project personal directories commonly found in Windows/OneDrive roots
 * that must NEVER be treated as code workspaces or automatically initialized with Git.
 */
export const PERSONAL_ONEDRIVE_EXCLUSION_NAMES = [
  'personal vault',
  'pictures',
  'photos',
  'camera roll',
  'videos',
  'music',
  'attachments',
  'desktop',
  'my games',
  'saved games',
  'family room',
  'scans',
  'documents'
] as const;

export const DiscoveredGitRemoteSchema = z.object({
  name: z.string(),
  url: z.string(),
  isGitHub: z.boolean(),
  owner: z.string().optional(),
  repoName: z.string().optional()
});
export type DiscoveredGitRemote = z.infer<typeof DiscoveredGitRemoteSchema>;

export const DiscoveredWorkspaceItemSchema = z.object({
  path: z.string(),
  name: z.string(),
  isGitRepo: z.boolean(),
  gitBranch: z.string().optional(),
  remotes: z.array(DiscoveredGitRemoteSchema),
  hasPackageJson: z.boolean().default(false),
  hasCargoToml: z.boolean().default(false),
  hasGoMod: z.boolean().default(false),
  hasPyproject: z.boolean().default(false),
  isNonDevPersonalFolder: z.boolean().default(false),
  isExcludedByDefault: z.boolean().default(false),
  suggestedAction: z.enum([
    'IMPORT_EXISTING_GIT',
    'LOCAL_ONLY_GIT',
    'EXCLUDE_PERSONAL',
    'OFFER_NEW_PROJECT'
  ])
});
export type DiscoveredWorkspaceItem = z.infer<typeof DiscoveredWorkspaceItemSchema>;

export const WorkspaceScanConfigSchema = z.object({
  rootDir: z.string(),
  maxDepth: z.number().int().min(1).max(5).default(3),
  customExclusions: z.array(z.string()).default([]),
  excludePersonalDirectories: z.boolean().default(true)
});
export type WorkspaceScanConfig = z.infer<typeof WorkspaceScanConfigSchema>;
export type WorkspaceScanConfigInput = z.input<typeof WorkspaceScanConfigSchema>;

export const WorkspaceScanResultSchema = z.object({
  rootScanned: z.string(),
  scannedDirectoriesCount: z.number().int().nonnegative(),
  discoveredGitProjects: z.array(DiscoveredWorkspaceItemSchema),
  untrackedDevFolders: z.array(DiscoveredWorkspaceItemSchema),
  excludedDirectories: z.array(
    z.object({
      path: z.string(),
      reason: z.string()
    })
  )
});
export type WorkspaceScanResult = z.infer<typeof WorkspaceScanResultSchema>;
