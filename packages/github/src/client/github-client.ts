import type { CredentialStore } from '@nimo-deck/core';
import type {
  GitHubRepo,
  GitHubBranch,
  GitHubPullRequest,
  GitHubIssue
} from '@nimo-deck/shared';
import { GitHubRateLimiter } from './rate-limiter.js';
import { GitHubAPIError, type PaginationOptions } from './types.js';

interface RawRepoPayload {
  id: number;
  name: string;
  full_name: string;
  owner?: { login?: string };
  description?: string | null;
  html_url: string;
  clone_url: string;
  ssh_url?: string;
  default_branch?: string;
  private?: boolean;
  fork?: boolean;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  updated_at?: string;
  pushed_at?: string | null;
}

interface RawBranchPayload {
  name: string;
  commit?: { sha?: string };
  protected?: boolean;
}

interface RawPRPayload {
  id: number;
  number: number;
  title: string;
  state: string;
  user?: { login?: string };
  html_url: string;
  created_at: string;
  updated_at: string;
  merged_at?: string | null;
  draft?: boolean;
}

interface RawIssuePayload {
  id: number;
  number: number;
  title: string;
  state: string;
  user?: { login?: string };
  html_url: string;
  labels?: Array<string | { name?: string }>;
  comments?: number;
  created_at: string;
  updated_at: string;
  pull_request?: unknown;
}

interface RawComparePayload {
  ahead_by?: number;
  behind_by?: number;
  status?: string;
}

export interface GitHubClientOptions {
  token?: string;
  credentialStore?: CredentialStore;
  baseUrl?: string;
  fetcher?: typeof fetch;
}

export class GitHubClient {
  private explicitToken?: string;
  private credentialStore?: CredentialStore;
  private baseUrl: string;
  private fetcher: typeof fetch;
  public readonly rateLimiter = new GitHubRateLimiter();

  constructor(options: GitHubClientOptions = {}) {
    this.explicitToken = options.token;
    this.credentialStore = options.credentialStore;
    this.baseUrl = options.baseUrl ?? 'https://api.github.com';
    this.fetcher = options.fetcher ?? fetch;
  }

  private async getToken(): Promise<string | null> {
    if (this.explicitToken) {
      return this.explicitToken;
    }
    if (this.credentialStore) {
      return this.credentialStore.getPassword('NIMO-DECK', 'github_pat');
    }
    return null;
  }

  /**
   * Internal authenticated HTTP request runner.
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (this.rateLimiter.isRateLimited()) {
      const waitMs = this.rateLimiter.getMsUntilReset();
      throw new GitHubAPIError(
        429,
        `GitHub API rate limit exceeded. Resets in ${Math.ceil(waitMs / 1000)} seconds.`,
        undefined,
        this.rateLimiter.getRateLimit() || undefined
      );
    }

    const token = await this.getToken();
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/vnd.github.v3+json');
    headers.set('User-Agent', 'NIMO-DECK-Agent/1.0');

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await this.fetcher(url, {
      ...options,
      headers
    });

    this.rateLimiter.updateFromHeaders(response.headers);

    if (!response.ok) {
      let errorMsg = response.statusText;
      let docUrl: string | undefined;

      try {
        const errJson = await response.json() as { message?: string; documentation_url?: string };
        if (errJson.message) errorMsg = errJson.message;
        if (errJson.documentation_url) docUrl = errJson.documentation_url;
      } catch {
        // Fall back to status text
      }

      throw new GitHubAPIError(response.status, errorMsg, docUrl, this.rateLimiter.getRateLimit() || undefined);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Discovers repositories belonging to the authenticated user.
   */
  async getUserRepos(options: PaginationOptions = {}): Promise<GitHubRepo[]> {
    const page = options.page ?? 1;
    const perPage = options.perPage ?? 50;

    const raw = await this.request<RawRepoPayload[]>(
      `/user/repos?per_page=${perPage}&page=${page}&sort=pushed&direction=desc`
    );

    return raw.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner?.login || '',
      description: r.description || null,
      htmlUrl: r.html_url,
      cloneUrl: r.clone_url,
      sshUrl: r.ssh_url,
      defaultBranch: r.default_branch || 'main',
      isPrivate: Boolean(r.private),
      isFork: Boolean(r.fork),
      starsCount: r.stargazers_count || 0,
      forksCount: r.forks_count || 0,
      openIssuesCount: r.open_issues_count || 0,
      updatedAt: r.updated_at || new Date().toISOString(),
      pushedAt: r.pushed_at || null
    }));
  }

  /**
   * Retrieves single repository metadata.
   */
  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    const r = await this.request<RawRepoPayload>(`/repos/${owner}/${repo}`);
    return {
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner?.login || owner,
      description: r.description || null,
      htmlUrl: r.html_url,
      cloneUrl: r.clone_url,
      sshUrl: r.ssh_url,
      defaultBranch: r.default_branch || 'main',
      isPrivate: Boolean(r.private),
      isFork: Boolean(r.fork),
      starsCount: r.stargazers_count || 0,
      forksCount: r.forks_count || 0,
      openIssuesCount: r.open_issues_count || 0,
      updatedAt: r.updated_at || new Date().toISOString(),
      pushedAt: r.pushed_at || null
    };
  }

  /**
   * Retrieves branches for a repository.
   */
  async getBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    const raw = await this.request<RawBranchPayload[]>(`/repos/${owner}/${repo}/branches?per_page=100`);
    return raw.map((b) => ({
      name: b.name,
      commitSha: b.commit?.sha || '',
      isProtected: Boolean(b.protected)
    }));
  }

  /**
   * Retrieves pull requests for a repository.
   */
  async getPullRequests(
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<GitHubPullRequest[]> {
    const raw = await this.request<RawPRPayload[]>(
      `/repos/${owner}/${repo}/pulls?state=${state}&per_page=50&sort=updated&direction=desc`
    );

    return raw.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: pr.state === 'closed' ? 'closed' : 'open',
      author: pr.user?.login || 'unknown',
      htmlUrl: pr.html_url,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at || null,
      isDraft: Boolean(pr.draft)
    }));
  }

  /**
   * Retrieves issues for a repository (excluding pull requests).
   */
  async getIssues(
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<GitHubIssue[]> {
    const raw = await this.request<RawIssuePayload[]>(
      `/repos/${owner}/${repo}/issues?state=${state}&per_page=50&sort=updated&direction=desc`
    );

    // GitHub returns PRs under /issues as well, identified by presence of 'pull_request' key
    return raw
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        state: issue.state === 'closed' ? 'closed' : 'open',
        author: issue.user?.login || 'unknown',
        htmlUrl: issue.html_url,
        labels: (issue.labels || []).map((l) => (typeof l === 'string' ? l : l.name || '')),
        commentsCount: issue.comments || 0,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at
      }));
  }

  /**
   * Compares two commits or branch heads.
   */
  async compareCommits(
    owner: string,
    repo: string,
    base: string,
    head: string
  ): Promise<{ aheadBy: number; behindBy: number; status: string }> {
    const raw = await this.request<RawComparePayload>(`/repos/${owner}/${repo}/compare/${base}...${head}`);
    return {
      aheadBy: raw.ahead_by || 0,
      behindBy: raw.behind_by || 0,
      status: raw.status || 'identical'
    };
  }
}
