import { describe, it, expect } from 'vitest';
import { RepositoryInventoryGenerator, GitHubClient } from '../src/index.js';
import { RepositoryInventorySchema, type Project, type GitHubRepo } from '@nimo-deck/shared';

describe('@nimo-deck/github: RepositoryInventoryGenerator', () => {
  it('should generate a validated repository inventory conforming to RepositoryInventorySchema', async () => {
    const mockClient = new GitHubClient();
    const generator = new RepositoryInventoryGenerator(mockClient);

    const localProjects: Project[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'NIMO-DECK',
        localPath: 'C:\\Projects\\NIMO-DECK',
        gitRemoteUrl: 'https://github.com/manav193/NIMO-DECK.git',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174002',
        name: 'LocalTool',
        localPath: 'C:\\Projects\\LocalTool',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const remoteRepos: GitHubRepo[] = [
      {
        id: 1,
        name: 'NIMO-DECK',
        fullName: 'manav193/NIMO-DECK',
        owner: 'manav193',
        description: 'Personal Development OS',
        htmlUrl: 'https://github.com/manav193/NIMO-DECK',
        cloneUrl: 'https://github.com/manav193/NIMO-DECK.git',
        defaultBranch: 'main',
        isPrivate: false,
        isFork: false,
        starsCount: 15,
        forksCount: 3,
        openIssuesCount: 4,
        updatedAt: new Date().toISOString(),
        pushedAt: new Date().toISOString()
      },
      {
        id: 2,
        name: 'UnclonedRepo',
        fullName: 'manav193/UnclonedRepo',
        owner: 'manav193',
        description: null,
        htmlUrl: 'https://github.com/manav193/UnclonedRepo',
        cloneUrl: 'https://github.com/manav193/UnclonedRepo.git',
        defaultBranch: 'main',
        isPrivate: true,
        isFork: false,
        starsCount: 0,
        forksCount: 0,
        openIssuesCount: 0,
        updatedAt: new Date().toISOString(),
        pushedAt: null
      }
    ];

    const inventory = await generator.generateInventory(localProjects, remoteRepos);

    expect(inventory.summary.totalLocal).toBe(2);
    expect(inventory.summary.totalRemote).toBe(2);
    expect(inventory.summary.totalMapped).toBe(1);
    expect(inventory.summary.totalLocalOnly).toBe(1);
    expect(inventory.summary.totalRemoteOnly).toBe(1);
    expect(inventory.summary.totalOpenIssues).toBe(4);

    // Validate schema
    const parseResult = RepositoryInventorySchema.safeParse(inventory);
    expect(parseResult.success).toBe(true);
  });
});
