import type { Project, GitHubRepo, MappedRepoPair } from '@nimo-deck/shared';
import { RepoUrlParser } from './repo-url-parser.js';

export interface MappingResult {
  mapped: MappedRepoPair[];
  localOnly: Project[];
  remoteOnly: GitHubRepo[];
}

export class RepoMapper {
  /**
   * Reconciles local projects against remote GitHub repositories.
   */
  static reconcile(projects: Project[], remoteRepos: GitHubRepo[]): MappingResult {
    const mapped: MappedRepoPair[] = [];
    const localOnly: Project[] = [];
    const remoteOnly: GitHubRepo[] = [];

    const remoteMap = new Map<string, GitHubRepo>();
    for (const r of remoteRepos) {
      remoteMap.set(r.fullName.toLowerCase(), r);
    }

    const matchedRemoteKeys = new Set<string>();

    for (const project of projects) {
      if (!project.gitRemoteUrl) {
        localOnly.push(project);
        continue;
      }

      const parsed = RepoUrlParser.parse(project.gitRemoteUrl);
      if (!parsed) {
        // Has a git remote, but not on GitHub (e.g. GitLab or local bare repo)
        localOnly.push(project);
        continue;
      }

      const key = parsed.fullName.toLowerCase();
      const matchedRemote = remoteMap.get(key);

      if (matchedRemote) {
        matchedRemoteKeys.add(key);

        // Calculate days since last remote push / activity
        let daysSinceLastActivity: number | undefined;
        let isInactive = false;
        if (matchedRemote.pushedAt) {
          const diffMs = Date.now() - new Date(matchedRemote.pushedAt).getTime();
          daysSinceLastActivity = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          isInactive = daysSinceLastActivity >= 60; // 60 days of inactivity
        }

        mapped.push({
          projectId: project.id,
          projectName: project.name,
          localPath: project.localPath,
          gitRemoteUrl: project.gitRemoteUrl,
          remoteRepo: matchedRemote,
          hasLocalPendingChanges: false,
          isInactive,
          daysSinceLastActivity
        });
      } else {
        localOnly.push(project);
      }
    }

    for (const [key, r] of remoteMap.entries()) {
      if (!matchedRemoteKeys.has(key)) {
        remoteOnly.push(r);
      }
    }

    return {
      mapped,
      localOnly,
      remoteOnly
    };
  }
}
