import { describe, it, expect } from 'vitest';
import { GitHubClient, GitHubAPIError } from '../src/index.js';

describe('@nimo-deck/github: GitHubClient', () => {
  it('should inject authorization header and user agent into outgoing requests', async () => {
    let capturedHeaders: Headers | undefined;

    const mockFetcher: typeof fetch = async (_input, init) => {
      capturedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify([{ id: 1, name: 'repo-1', full_name: 'user/repo-1' }]), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': '1800000000'
        }
      });
    };

    const client = new GitHubClient({
      token: 'ghp_secret_token_abc123',
      fetcher: mockFetcher
    });

    const repos = await client.getUserRepos();
    expect(repos).toHaveLength(1);
    expect(capturedHeaders?.get('Authorization')).toBe('Bearer ghp_secret_token_abc123');
    expect(capturedHeaders?.get('User-Agent')).toContain('NIMO-DECK');
  });

  it('should redact tokens from error messages when requests fail', async () => {
    const mockFetcher: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          message: 'Bad credentials for token ghp_secret_token_abc1234567890abcdef'
        }),
        {
          status: 401,
          headers: { 'content-type': 'application/json' }
        }
      );
    };

    const client = new GitHubClient({
      token: 'ghp_secret_token_abc1234567890abcdef',
      fetcher: mockFetcher
    });

    await expect(client.getUserRepos()).rejects.toThrow(GitHubAPIError);

    try {
      await client.getUserRepos();
    } catch (err: any) {
      expect(err.message).not.toContain('ghp_secret_token');
      expect(err.message).toContain('[REDACTED_TOKEN]');
    }
  });

  it('should fetch pull requests and issues cleanly', async () => {
    const mockFetcher: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('/pulls')) {
        return new Response(
          JSON.stringify([
            {
              id: 101,
              number: 42,
              title: 'feat: add dark mode',
              state: 'open',
              user: { login: 'manav193' },
              html_url: 'https://github.com/manav193/NIMO-DECK/pull/42',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              draft: false
            }
          ]),
          { status: 200 }
        );
      }

      if (url.includes('/issues')) {
        return new Response(
          JSON.stringify([
            {
              id: 201,
              number: 1,
              title: 'Bug: debounce timeout',
              state: 'open',
              user: { login: 'dev' },
              html_url: 'https://github.com/manav193/NIMO-DECK/issues/1',
              labels: [{ name: 'bug' }],
              comments: 3,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              // Pull request item returned by GitHub issues endpoint - should be filtered out
              id: 202,
              number: 42,
              title: 'PR item',
              pull_request: {}
            }
          ]),
          { status: 200 }
        );
      }

      return new Response('Not found', { status: 404 });
    };

    const client = new GitHubClient({ fetcher: mockFetcher });
    const prs = await client.getPullRequests('manav193', 'NIMO-DECK');
    expect(prs).toHaveLength(1);
    expect(prs[0].number).toBe(42);

    const issues = await client.getIssues('manav193', 'NIMO-DECK');
    expect(issues).toHaveLength(1);
    expect(issues[0].title).toBe('Bug: debounce timeout');
    expect(issues[0].labels).toContain('bug');
  });
});
