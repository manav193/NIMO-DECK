import { describe, it, expect } from 'vitest';
import { RepoMapper } from '../src/index.js';
import type { Project, GitHubRepo } from '@nimo-deck/shared';

describe('@nimo-deck/github: RepoMapper', () => {
  it('should reconcile local projects and remote repositories accurately', () => {
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
        name: 'LocalScratch',
        localPath: 'C:\\Projects\\Scratch',
        gitRemoteUrl: undefined,
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
        starsCount: 5,
        forksCount: 0,
        openIssuesCount: 2,
        updatedAt: new Date().toISOString(),
        pushedAt: new Date().toISOString()
      },
      {
        id: 2,
        name: 'RemoteOnlyService',
        fullName: 'manav193/RemoteOnlyService',
        owner: 'manav193',
        description: null,
        htmlUrl: 'https://github.com/manav193/RemoteOnlyService',
        cloneUrl: 'https://github.com/manav193/RemoteOnlyService.git',
        defaultBranch: 'main',
        isPrivate: true,
        isFork: false,
        starsCount: 0,
        forksCount: 0,
        openIssuesCount: 0,
        updatedAt: new Date().toISOString(),
        pushedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days ago
      }
    ];

    const res = RepoMapper.reconcile(localProjects, remoteRepos);

    expect(res.mapped).toHaveLength(1);
    expect(res.mapped[0].projectName).toBe('NIMO-DECK');
    expect(res.mapped[0].remoteRepo?.fullName).toBe('manav193/NIMO-DECK');
    expect(res.mapped[0].isInactive).toBe(false);

    expect(res.localOnly).toHaveLength(1);
    expect(res.localOnly[0].name).toBe('LocalScratch');

    expect(res.remoteOnly).toHaveLength(1);
    expect(res.remoteOnly[0].name).toBe('RemoteOnlyService');
  });
});
