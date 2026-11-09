import type { CredentialStore } from '@nimo-deck/core';
import type { GoogleTokenResponse, OAuthCredentials, TokenRecord } from './types.js';

export class GoogleOAuthHandler {
  private activeToken: TokenRecord | null = null;
  private fetcher: typeof fetch;

  constructor(
    private credentials: OAuthCredentials,
    private credentialStore?: CredentialStore,
    fetcher?: typeof fetch
  ) {
    this.fetcher = fetcher ?? fetch;
  }

  /**
   * Generates authorization URL for user login.
   */
  getAuthorizationUrl(scope = 'https://www.googleapis.com/auth/drive.file'): string {
    const redirect = this.credentials.redirectUri || 'http://localhost:8085/oauth/callback';
    const params = new URLSearchParams({
      client_id: this.credentials.clientId,
      redirect_uri: redirect,
      response_type: 'code',
      scope,
      access_type: 'offline',
      prompt: 'consent'
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for access and refresh tokens.
   */
  async exchangeCode(code: string): Promise<TokenRecord> {
    const redirect = this.credentials.redirectUri || 'http://localhost:8085/oauth/callback';
    const body = new URLSearchParams({
      code,
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
      redirect_uri: redirect,
      grant_type: 'authorization_code'
    });

    const res = await this.fetcher('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    if (!res.ok) {
      throw new Error(`[Google OAuth Error] Token exchange failed with status ${res.status}`);
    }

    const data = (await res.json()) as GoogleTokenResponse;
    const expiresAt = Date.now() + data.expires_in * 1000 - 60000; // 60s buffer

    this.activeToken = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt
    };

    if (data.refresh_token && this.credentialStore) {
      await this.credentialStore.setPassword(
        'NIMO-DECK',
        'gdrive_refresh_token',
        data.refresh_token
      );
    }

    return this.activeToken;
  }

  /**
   * Retrieves a valid access token, automatically refreshing if expired.
   */
  async getValidAccessToken(): Promise<string> {
    const now = Date.now();

    if (this.activeToken && this.activeToken.expiresAt > now) {
      return this.activeToken.accessToken;
    }

    // Attempt refresh
    let refreshToken = this.activeToken?.refreshToken;
    if (!refreshToken && this.credentialStore) {
      refreshToken = (await this.credentialStore.getPassword(
        'NIMO-DECK',
        'gdrive_refresh_token'
      )) || undefined;
    }

    if (!refreshToken) {
      throw new Error('[Google Drive Auth] No refresh token available. User authentication required.');
    }

    const body = new URLSearchParams({
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    const res = await this.fetcher('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    if (!res.ok) {
      throw new Error(`[Google OAuth Error] Token refresh failed with status ${res.status}`);
    }

    const data = (await res.json()) as GoogleTokenResponse;
    const expiresAt = Date.now() + data.expires_in * 1000 - 60000;

    this.activeToken = {
      accessToken: data.access_token,
      refreshToken,
      expiresAt
    };

    return this.activeToken.accessToken;
  }

  setManualToken(token: TokenRecord): void {
    this.activeToken = token;
  }
}
