import fs from 'node:fs';
import path from 'node:path';
import {
  PERSONAL_ONEDRIVE_EXCLUSION_NAMES,
  isImmutableIgnored,
  WorkspaceScanConfigSchema,
  type DiscoveredWorkspaceItem,
  type DiscoveredGitRemote,
  type WorkspaceScanConfigInput,
  type WorkspaceScanResult
} from '@nimo-deck/shared';
import type { ProjectRepository } from '../repositories/project-repository.js';
import type { ProductionLogger } from '../logging/production-logger.js';

export class WorkspaceOnboardingService {
  constructor(
    private projectRepo?: ProjectRepository,
    private logger?: ProductionLogger
  ) {}

  /**
   * Scans a root workspace directory (such as C:\Users\manav\OneDrive) and
   * safely discovers Git projects, detects GitHub remotes, and quarantines personal directories.
   */
  async scanWorkspace(config: WorkspaceScanConfigInput): Promise<WorkspaceScanResult> {
    const parsed = WorkspaceScanConfigSchema.parse(config);
    const root = path.resolve(parsed.rootDir);
    const maxDepth = parsed.maxDepth;
    const customExclusions = new Set(
      parsed.customExclusions.map((x) => x.toLowerCase().trim())
    );

    const discoveredGitProjects: DiscoveredWorkspaceItem[] = [];
    const untrackedDevFolders: DiscoveredWorkspaceItem[] = [];
    const excludedDirectories: Array<{ path: string; reason: string }> = [];

    let scannedCount = 0;

    if (!fs.existsSync(root)) {
      return {
        rootScanned: root,
        scannedDirectoriesCount: 0,
        discoveredGitProjects: [],
        untrackedDevFolders: [],
        excludedDirectories: [{ path: root, reason: 'Root directory does not exist' }]
      };
    }

    const traverse = (currentDir: string, currentDepth: number) => {
      if (currentDepth > maxDepth) return;

      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        // Skip unreadable directories
        return;
      }

      scannedCount++;

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const dirName = entry.name;
        const dirLower = dirName.toLowerCase();
        const fullPath = path.join(currentDir, dirName);

        // 1. Check immutable ignored patterns (.git, node_modules, dist, etc.)
        if (isImmutableIgnored(fullPath) || isImmutableIgnored(dirName)) {
          continue;
        }

        // 2. Check custom user exclusions
        if (customExclusions.has(dirLower) || customExclusions.has(fullPath.toLowerCase())) {
          excludedDirectories.push({ path: fullPath, reason: 'Excluded by user preference' });
          continue;
        }

        // 3. Check personal OneDrive directories
        if (
          parsed.excludePersonalDirectories !== false &&
          PERSONAL_ONEDRIVE_EXCLUSION_NAMES.some(
            (p) => dirLower === p || dirLower.startsWith(`${p}\\`) || dirLower.startsWith(`${p}/`)
          )
        ) {
          excludedDirectories.push({
            path: fullPath,
            reason: 'Personal non-project directory protected from synchronization'
          });
          continue;
        }

        // 4. Check if directory is a Git repository
        const gitDir = path.join(fullPath, '.git');
        const isGit = fs.existsSync(gitDir);

        if (isGit) {
          const remotes = this.parseGitRemotes(gitDir);
          const hasRemotes = remotes.length > 0;
          const gitBranch = this.parseGitHeadBranch(gitDir);

          const item: DiscoveredWorkspaceItem = {
            path: fullPath,
            name: dirName,
            isGitRepo: true,
            gitBranch,
            remotes,
            hasPackageJson: fs.existsSync(path.join(fullPath, 'package.json')),
            hasCargoToml: fs.existsSync(path.join(fullPath, 'Cargo.toml')),
            hasGoMod: fs.existsSync(path.join(fullPath, 'go.mod')),
            hasPyproject: fs.existsSync(path.join(fullPath, 'pyproject.toml')),
            isNonDevPersonalFolder: false,
            isExcludedByDefault: false,
            suggestedAction: hasRemotes ? 'IMPORT_EXISTING_GIT' : 'LOCAL_ONLY_GIT'
          };

          discoveredGitProjects.push(item);
          // Do not traverse deeper into an already discovered git project root
          continue;
        }

        // 5. Check if it's a non-git folder with project manifests
        const hasPkg = fs.existsSync(path.join(fullPath, 'package.json'));
        const hasCargo = fs.existsSync(path.join(fullPath, 'Cargo.toml'));
        const hasGo = fs.existsSync(path.join(fullPath, 'go.mod'));
        const hasPy = fs.existsSync(path.join(fullPath, 'pyproject.toml'));

        if (hasPkg || hasCargo || hasGo || hasPy) {
          untrackedDevFolders.push({
            path: fullPath,
            name: dirName,
            isGitRepo: false,
            remotes: [],
            hasPackageJson: hasPkg,
            hasCargoToml: hasCargo,
            hasGoMod: hasGo,
            hasPyproject: hasPy,
            isNonDevPersonalFolder: false,
            isExcludedByDefault: false,
            suggestedAction: 'OFFER_NEW_PROJECT'
          });
          // Do not recurse into package roots
          continue;
        }

        // Recurse into subdirectories
        traverse(fullPath, currentDepth + 1);
      }
    };

    traverse(root, 1);

    this.logger?.info('WorkspaceOnboarding', `Scanned ${root}: found ${discoveredGitProjects.length} git projects`);

    return {
      rootScanned: root,
      scannedDirectoriesCount: scannedCount,
      discoveredGitProjects,
      untrackedDevFolders,
      excludedDirectories
    };
  }

  /**
   * Safely batch registers selected discovered projects into DECK Core.
   * Enforces non-destructive guarantees:
   * - Never initializes git in arbitrary non-project directories.
   * - Never stages or commits files during onboarding.
   */
  async importBatch(items: Array<{ path: string; name: string; gitRemoteUrl?: string }>): Promise<{
    imported: number;
    skipped: number;
    projects: Array<{ id: string; name: string; localPath: string }>;
  }> {
    if (!this.projectRepo) {
      throw new Error('ProjectRepository required for import operations');
    }

    let imported = 0;
    let skipped = 0;
    const registered: Array<{ id: string; name: string; localPath: string }> = [];

    for (const item of items) {
      const existing = this.projectRepo.getByPath(item.path);
      if (existing) {
        skipped++;
        registered.push(existing);
        continue;
      }

      const created = this.projectRepo.create({
        name: item.name,
        localPath: item.path,
        gitRemoteUrl: item.gitRemoteUrl
      });

      imported++;
      registered.push(created);
    }

    return { imported, skipped, projects: registered };
  }

  private parseGitRemotes(gitDir: string): DiscoveredGitRemote[] {
    const configPath = path.join(gitDir, 'config');
    if (!fs.existsSync(configPath)) return [];

    const remotes: DiscoveredGitRemote[] = [];
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      const remoteBlockRegex = /\[remote\s+"([^"]+)"\][^[]*url\s*=\s*([^\r\n]+)/gi;

      let match: RegExpExecArray | null;
      while ((match = remoteBlockRegex.exec(content)) !== null) {
        const name = match[1].trim();
        const url = match[2].trim();
        const isGitHub = url.includes('github.com');

        let owner: string | undefined;
        let repoName: string | undefined;

        if (isGitHub) {
          const ghMatch = url.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?/i);
          if (ghMatch) {
            owner = ghMatch[1];
            repoName = ghMatch[2];
          }
        }

        remotes.push({ name, url, isGitHub, owner, repoName });
      }
    } catch {
      // Ignore parse failure
    }

    return remotes;
  }

  private parseGitHeadBranch(gitDir: string): string | undefined {
    const headPath = path.join(gitDir, 'HEAD');
    if (!fs.existsSync(headPath)) return undefined;

    try {
      const head = fs.readFileSync(headPath, 'utf8').trim();
      if (head.startsWith('ref: refs/heads/')) {
        return head.replace('ref: refs/heads/', '');
      }
      return head.slice(0, 7); // Detached HEAD SHA prefix
    } catch {
      return undefined;
    }
  }
}
