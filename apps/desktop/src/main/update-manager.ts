import type { ProductionLogger } from '@nimo-deck/core';

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseUrl?: string;
  releaseNotes?: string;
  publishedAt?: string;
}

export class AppUpdateManager {
  private currentVersion = '0.1.0';

  constructor(
    private logger: ProductionLogger,
    currentVersion = '0.1.0'
  ) {
    this.currentVersion = currentVersion;
  }

  async checkForUpdates(): Promise<UpdateCheckResult> {
    this.logger.info('UpdateManager', `Checking for updates (current: v${this.currentVersion})...`);

    try {
      const response = await fetch(
        'https://api.github.com/repos/manav193/NIMO-DECK/releases/latest',
        {
          headers: {
            'User-Agent': `NIMO-DECK-Desktop/v${this.currentVersion}`
          }
        }
      );

      if (!response.ok) {
        return {
          currentVersion: this.currentVersion,
          latestVersion: this.currentVersion,
          updateAvailable: false
        };
      }

      const data = (await response.json()) as {
        tag_name?: string;
        html_url?: string;
        body?: string;
        published_at?: string;
      };

      const remoteTag = data.tag_name ? data.tag_name.replace(/^v/, '') : this.currentVersion;
      const updateAvailable = this.compareSemver(remoteTag, this.currentVersion) > 0;

      return {
        currentVersion: this.currentVersion,
        latestVersion: remoteTag,
        updateAvailable,
        releaseUrl: data.html_url,
        releaseNotes: data.body,
        publishedAt: data.published_at
      };
    } catch {
      // In offline environments
      return {
        currentVersion: this.currentVersion,
        latestVersion: this.currentVersion,
        updateAvailable: false
      };
    }
  }

  private compareSemver(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      const na = pa[i] || 0;
      const nb = pb[i] || 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  }
}
