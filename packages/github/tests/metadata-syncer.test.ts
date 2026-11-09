import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GitHubMetadataSyncer, GitHubClient } from '../src/index.js';
import {
  createDatabaseConnection,
  ProjectRepository,
  RemoteSyncStateRepository
} from '@nimo-deck/core';
import type { Project } from '@nimo-deck/shared';
import type Database from 'better-sqlite3';

describe('@nimo-deck/github: GitHubMetadataSyncer', () => {
  let sqlite: Database.Database;
  let projectRepo: ProjectRepository;
  let remoteSyncStateRepo: RemoteSyncStateRepository;

  beforeEach(() => {
    const conn = createDatabaseConnection({ inMemory: true });
    sqlite = conn.sqlite;
    projectRepo = new ProjectRepository(conn.db);
    remoteSyncStateRepo = new RemoteSyncStateRepository(conn.db);
  });

  afterEach(() => {
    sqlite.close();
  });

  it('should synchronize remote branches, PRs, issues and update local database', async () => {
    const mockFetcher: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith('/repos/manav193/NIMO-DECK')) {
        return new Response(
          JSON.stringify({
            id: 1,
            name: 'NIMO-DECK',
            full_name: 'manav193/NIMO-DECK',
            default_branch: 'main',
            stargazers_count: 10,
            open_issues_count: 1
          }),
          { status: 200 }
        );
      }
      if (url.includes('/branches')) {
        return new Response(
          JSON.stringify([
            { name: 'main', commit: { sha: '1111111111111111111111111111111111111111' } },
            { name: 'feat/ui', commit: { sha: '2222222222222222222222222222222222222222' } }
          ]),
          { status: 200 }
        );
      }
      if (url.includes('/pulls')) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url.includes('/issues')) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    };

    const client = new GitHubClient({ fetcher: mockFetcher });
    const syncer = new GitHubMetadataSyncer(client, remoteSyncStateRepo);

    const project = projectRepo.create({
      name: 'NIMO-DECK',
      localPath: 'C:\\Projects\\NIMO-DECK',
      gitRemoteUrl: 'https://github.com/manav193/NIMO-DECK.git'
    });

    const res = await syncer.syncProject(project);

    expect(res).not.toBeNull();
    expect(res?.repo?.fullName).toBe('manav193/NIMO-DECK');
    expect(res?.branches).toHaveLength(2);

    // Verify local database update
    const mainBranch = remoteSyncStateRepo.getState(project.id, 'main');
    expect(mainBranch).not.toBeNull();
    expect(mainBranch?.remoteHeadSha).toBe('1111111111111111111111111111111111111111');
  });
});
