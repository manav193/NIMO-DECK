export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  fullName: string;
  httpsUrl: string;
  sshUrl: string;
}

export class RepoUrlParser {
  /**
   * Parses and normalizes any GitHub remote URL (HTTPS, SSH, git://).
   */
  static parse(url: string): ParsedGitHubUrl | null {
    if (!url || typeof url !== 'string') return null;

    const trimmed = url.trim();

    // Regex matching GitHub SSH, HTTPS, and git protocol URLs:
    // 1. git@github.com:owner/repo.git
    // 2. ssh://git@github.com/owner/repo.git
    // 3. https://github.com/owner/repo(.git)?
    // 4. http://github.com/owner/repo
    const regex = /(?:https?:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?(?:\/)?$/;
    const match = trimmed.match(regex);

    if (!match) return null;

    const owner = match[1];
    const repo = match[2];
    const fullName = `${owner}/${repo}`;
    const httpsUrl = `https://github.com/${owner}/${repo}.git`;
    const sshUrl = `git@github.com:${owner}/${repo}.git`;

    return {
      owner,
      repo,
      fullName,
      httpsUrl,
      sshUrl
    };
  }

  /**
   * Compares two Git remote URLs for equivalence, ignoring protocol differences (.git suffix, ssh vs https).
   */
  static areEquivalent(urlA: string, urlB: string): boolean {
    const parsedA = this.parse(urlA);
    const parsedB = this.parse(urlB);

    if (!parsedA || !parsedB) return false;
    return parsedA.fullName.toLowerCase() === parsedB.fullName.toLowerCase();
  }
}
