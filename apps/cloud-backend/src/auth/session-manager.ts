import crypto from 'node:crypto';

export interface TokenPayload {
  sub: string; // User or Device ID
  role: 'USER' | 'DEVICE' | 'ADMIN';
  sessionId: string;
  iat: number;
  exp: number;
}

export interface Session {
  id: string;
  subjectId: string;
  role: 'USER' | 'DEVICE' | 'ADMIN';
  refreshToken: string;
  expiresAt: number;
  revoked: boolean;
  createdAt: number;
}

export class SessionManager {
  private secretKey: string;
  private sessions: Map<string, Session> = new Map();
  private rateLimits: Map<string, { count: number; windowStart: number }> = new Map();

  constructor(secretKey?: string) {
    this.secretKey = secretKey || process.env.DECK_JWT_SECRET || crypto.randomBytes(32).toString('hex');
  }

  createSession(subjectId: string, role: 'USER' | 'DEVICE' | 'ADMIN' = 'USER'): {
    accessToken: string;
    refreshToken: string;
    expiresInSeconds: number;
  } {
    const sessionId = crypto.randomUUID();
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const now = Math.floor(Date.now() / 1000);
    const accessTtl = 15 * 60; // 15 minutes
    const refreshTtl = 7 * 24 * 60 * 60; // 7 days

    const session: Session = {
      id: sessionId,
      subjectId,
      role,
      refreshToken,
      expiresAt: now + refreshTtl,
      revoked: false,
      createdAt: now
    };

    this.sessions.set(sessionId, session);

    const payload: TokenPayload = {
      sub: subjectId,
      role,
      sessionId,
      iat: now,
      exp: now + accessTtl
    };

    const accessToken = this.signToken(payload);
    return { accessToken, refreshToken, expiresInSeconds: accessTtl };
  }

  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [headerB64, payloadB64, signatureB64] = parts;
      const expectedSig = crypto
        .createHmac('sha256', this.secretKey)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');

      if (expectedSig !== signatureB64) return null;

      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as TokenPayload;
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) return null;

      const session = this.sessions.get(payload.sessionId);
      if (!session || session.revoked) return null;

      return payload;
    } catch {
      return null;
    }
  }

  refreshSession(refreshToken: string): { accessToken: string; newRefreshToken: string } | null {
    let targetSession: Session | null = null;
    for (const session of this.sessions.values()) {
      if (session.refreshToken === refreshToken && !session.revoked) {
        targetSession = session;
        break;
      }
    }

    if (!targetSession) return null;

    const now = Math.floor(Date.now() / 1000);
    if (targetSession.expiresAt < now) {
      targetSession.revoked = true;
      return null;
    }

    // Rotate refresh token
    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    targetSession.refreshToken = newRefreshToken;

    const accessTtl = 15 * 60;
    const payload: TokenPayload = {
      sub: targetSession.subjectId,
      role: targetSession.role,
      sessionId: targetSession.id,
      iat: now,
      exp: now + accessTtl
    };

    const accessToken = this.signToken(payload);
    return { accessToken, newRefreshToken };
  }

  revokeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.revoked = true;
      return true;
    }
    return false;
  }

  checkRateLimit(key: string, limit = 100, windowSec = 60): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const entry = this.rateLimits.get(key);

    if (!entry || now - entry.windowStart > windowSec * 1000) {
      this.rateLimits.set(key, { count: 1, windowStart: now });
      return { allowed: true, remaining: limit - 1 };
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0 };
    }

    entry.count++;
    return { allowed: true, remaining: limit - entry.count };
  }

  private signToken(payload: TokenPayload): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const signatureB64 = crypto
      .createHmac('sha256', this.secretKey)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    return `${headerB64}.${payloadB64}.${signatureB64}`;
  }
}
