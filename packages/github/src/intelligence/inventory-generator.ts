import type { GitHubClient } from '../client/github-client.js';
import { RepoMapper } from '../mapper/mapper.js';
import type {
  Project,
  RepositoryInventory,
  GitHubRepo
} from '@nimo-deck/shared';

export class RepositoryInventoryGenerator {
  constructor(private client: GitHubClient) {}

  /**
   * Generates a unified repository intelligence inventory across local and remote projects.
   */
  async generateInventory(
    localProjects: Project[],
    knownRemoteRepos?: GitHubRepo[]
  ): Promise<RepositoryInventory> {
    const remoteRepos = knownRemoteRepos ?? (await this.client.getUserRepos({ perPage: 100 }));
    const reconciliation = RepoMapper.reconcile(localProjects, remoteRepos);

    let totalOpenIssues = 0;
    for (const r of reconciliation.mapped) {
      if (r.remoteRepo) {
        totalOpenIssues += r.remoteRepo.openIssuesCount;
      }
    }

    return {
      localOnlyProjects: reconciliation.localOnly.map((p) => ({
        id: p.id,
        name: p.name,
        localPath: p.localPath
      })),
      remoteOnlyRepos: reconciliation.remoteOnly,
      mappedRepositories: reconciliation.mapped,
      summary: {
        totalLocal: localProjects.length,
        totalRemote: remoteRepos.length,
        totalMapped: reconciliation.mapped.length,
        totalLocalOnly: reconciliation.localOnly.length,
        totalRemoteOnly: reconciliation.remoteOnly.length,
        totalOpenIssues,
        totalOpenPRs: 0 // Aggregated dynamically when detailed sync is requested
      },
      generatedAt: new Date().toISOString()
    };
  }
}
