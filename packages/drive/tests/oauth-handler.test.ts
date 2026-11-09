import { describe, it, expect } from 'vitest';
import { GoogleOAuthHandler } from '../src/index.js';
import { InMemoryCredentialStore } from '@nimo-deck/core';

describe('@nimo-deck/drive: GoogleOAuthHandler', () => {
  const credentials = {
    clientId: 'test-client-id-123.apps.googleusercontent.com',
    clientSecret: 'GOCSPX-test-client-secret-abc',
    redirectUri: 'http://localhost:8085/oauth/callback'
  };

  it('should generate properly parameterized authorization URL', () => {
    const handler = new GoogleOAuthHandler(credentials);
    const url = handler.getAuthorizationUrl();

    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain('client_id=test-client-id-123.apps.googleusercontent.com');
    expect(url).toContain('access_type=offline');
    expect(url).toContain('prompt=consent');
  });

  it('should exchange code for tokens and persist refresh token in CredentialStore', async () => {
    const store = new InMemoryCredentialStore();

    const mockFetcher: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          access_token: 'ya29.test_access_token',
          refresh_token: '1//04test_refresh_token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'https://www.googleapis.com/auth/drive.file'
        }),
        { status: 200 }
      );
    };

    const handler = new GoogleOAuthHandler(credentials, store, mockFetcher);
    const tokens = await handler.exchangeCode('auth_code_xyz');

    expect(tokens.accessToken).toBe('ya29.test_access_token');
    expect(tokens.refreshToken).toBe('1//04test_refresh_token');

    // Verify stored in secure credential enclave
    const storedRefresh = await store.getPassword('NIMO-DECK', 'gdrive_refresh_token');
    expect(storedRefresh).toBe('1//04test_refresh_token');
  });

  it('should automatically refresh access token when expired', async () => {
    const store = new InMemoryCredentialStore();
    await store.setPassword('NIMO-DECK', 'gdrive_refresh_token', '1//stored_refresh');

    let refreshCalled = false;
    const mockFetcher: typeof fetch = async () => {
      refreshCalled = true;
      return new Response(
        JSON.stringify({
          access_token: 'ya29.new_refreshed_access_token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'https://www.googleapis.com/auth/drive.file'
        }),
        { status: 200 }
      );
    };

    const handler = new GoogleOAuthHandler(credentials, store, mockFetcher);
    const token = await handler.getValidAccessToken();

    expect(refreshCalled).toBe(true);
    expect(token).toBe('ya29.new_refreshed_access_token');
  });
});
