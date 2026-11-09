export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

export interface TokenRecord {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp in ms
}
