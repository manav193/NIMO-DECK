export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTimestamp: number; // Unix timestamp in seconds
  used: number;
}

export class GitHubAPIError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly documentationUrl?: string,
    public readonly rateLimit?: RateLimitInfo
  ) {
    // Redact tokens from error message if accidentally present
    const sanitized = message.replace(/(?:ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)/g, '[REDACTED_TOKEN]');
    super(`[GitHub API ${status}] ${sanitized}`);
    this.name = 'GitHubAPIError';
  }
}

export interface PaginationOptions {
  page?: number;
  perPage?: number;
}
