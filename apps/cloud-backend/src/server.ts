import http from 'node:http';
import { SessionManager } from './auth/session-manager.js';
import {
  DevicePairingRequestSchema,
  CrossDeviceSyncPayloadSchema,
  type Device,
  type CrossDeviceSyncMetadata
} from '@nimo-deck/shared';
import crypto from 'node:crypto';

export interface CloudServerConfig {
  port?: number;
  host?: string;
  jwtSecret?: string;
  masterPassword?: string;
}

export class CloudControlPlaneServer {
  private server: http.Server | null = null;
  readonly sessionManager: SessionManager;
  private readonly port: number;
  private readonly host: string;
  private readonly masterPassword: string;

  // In-memory federated store (can be backed by PostgreSQL in production)
  private registeredDevices: Map<string, Device> = new Map();
  private federatedProjects: Map<string, CrossDeviceSyncMetadata & { lastUpdatedByDeviceId: string }> = new Map();
  private auditEvents: Array<{ timestamp: string; action: string; actor: string; details?: unknown }> = [];

  constructor(config: CloudServerConfig = {}) {
    this.port = config.port || parseInt(process.env.CLOUD_PORT || '4000', 10);
    this.host = config.host || '0.0.0.0';
    this.masterPassword = config.masterPassword || process.env.DECK_MASTER_PASSWORD || 'deck-admin-secure-2026';
    this.sessionManager = new SessionManager(config.jwtSecret);
  }

  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        // Global CORS Headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        // Rate limiting check per client IP
        const clientIp = req.socket.remoteAddress || '127.0.0.1';
        const rateCheck = this.sessionManager.checkRateLimit(clientIp, 120, 60);
        res.setHeader('X-RateLimit-Remaining', String(rateCheck.remaining));
        if (!rateCheck.allowed) {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Too Many Requests: Rate limit exceeded. Try again in 60s.' }));
          return;
        }

        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const pathname = url.pathname;

        try {
          // 1. Health Probe
          if (pathname === '/health' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                status: 'ok',
                service: 'NIMO-DECK Cloud Control Plane',
                federatedDevicesCount: this.registeredDevices.size,
                federatedProjectsCount: this.federatedProjects.size,
                timestamp: new Date().toISOString()
              })
            );
            return;
          }

          // 2. Auth: Login
          if (pathname === '/api/v1/auth/login' && req.method === 'POST') {
            const body = await this.readJson(req);
            if (body.password !== this.masterPassword) {
              this.logAudit('AUTH_FAILED', 'ANONYMOUS', { ip: clientIp });
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid master credentials' }));
              return;
            }

            const session = this.sessionManager.createSession('admin-user', 'ADMIN');
            this.logAudit('USER_LOGIN', 'admin-user', { ip: clientIp });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(session));
            return;
          }

          // 3. Auth: Refresh Token
          if (pathname === '/api/v1/auth/refresh' && req.method === 'POST') {
            const body = await this.readJson(req);
            const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : '';
            const rotated = this.sessionManager.refreshSession(refreshToken);
            if (!rotated) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid or expired refresh token' }));
              return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(rotated));
            return;
          }

          // 4. Device Pairing: Public endpoint requiring valid pairing code
          if (pathname === '/api/v1/devices/pair' && req.method === 'POST') {
            const body = await this.readJson(req);
            const parsed = DevicePairingRequestSchema.safeParse(body);
            if (!parsed.success) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid pairing request', details: parsed.error.issues }));
              return;
            }

            const reqData = parsed.data;
            const deviceId = crypto.randomUUID();
            const device: Device = {
              id: deviceId,
              name: reqData.deviceName,
              fingerprint: reqData.fingerprint,
              deviceType: reqData.deviceType,
              status: 'ACTIVE',
              publicKey: reqData.publicKey,
              clientVersion: '0.1.0',
              ipAddress: clientIp,
              lastSeenAt: new Date(),
              createdAt: new Date()
            };

            this.registeredDevices.set(deviceId, device);
            const session = this.sessionManager.createSession(deviceId, 'DEVICE');

            this.logAudit('DEVICE_PAIRED', deviceId, { deviceName: reqData.deviceName, ip: clientIp });

            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                deviceId,
                authToken: session.accessToken,
                refreshToken: session.refreshToken,
                expiresInSeconds: session.expiresInSeconds,
                clusterFederationUrl: `http://${this.host}:${this.port}`
              })
            );
            return;
          }

          // === Authenticated Routes ===
          const authUser = this.authenticate(req);
          if (!authUser) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized: Missing or invalid authorization token' }));
            return;
          }

          // 5. List Devices
          if (pathname === '/api/v1/devices' && req.method === 'GET') {
            const list = Array.from(this.registeredDevices.values());
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(list));
            return;
          }

          // 6. Cross-Device Federated Sync Metadata Broadcast
          if (pathname === '/api/v1/sync/metadata' && req.method === 'POST') {
            const body = await this.readJson(req);
            const parsed = CrossDeviceSyncPayloadSchema.safeParse(body);
            if (!parsed.success) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid sync payload', details: parsed.error.issues }));
              return;
            }

            const payload = parsed.data;
            const conflicts: Array<{ projectId: string; conflict: string }> = [];

            for (const proj of payload.projects) {
              const existing = this.federatedProjects.get(proj.projectId);
              if (
                existing &&
                existing.lastUpdatedByDeviceId !== payload.sourceDeviceId &&
                existing.latestAuditSequence &&
                proj.latestAuditSequence &&
                existing.latestAuditSequence > proj.latestAuditSequence
              ) {
                conflicts.push({
                  projectId: proj.projectId,
                  conflict: `Device '${existing.lastUpdatedByDeviceId}' is ahead on sequence ${existing.latestAuditSequence}`
                });
              } else {
                this.federatedProjects.set(proj.projectId, {
                  ...proj,
                  lastUpdatedByDeviceId: payload.sourceDeviceId
                });
              }
            }

            this.logAudit('METADATA_SYNCED', payload.sourceDeviceId, {
              projectCount: payload.projects.length,
              conflictsCount: conflicts.length
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: true,
                federatedProjectsCount: this.federatedProjects.size,
                conflicts
              })
            );
            return;
          }

          // Fallthrough: 404 Not Found
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'API route not found' }));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: message }));
        }
      });

      this.server.listen(this.port, this.host, () => {
        resolve(this.port);
      });

      this.server.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private authenticate(req: http.IncomingMessage) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);
    return this.sessionManager.verifyAccessToken(token);
  }

  private async readJson(req: http.IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          reject(new Error('Invalid JSON request body'));
        }
      });
    });
  }

  private logAudit(action: string, actor: string, details?: unknown) {
    this.auditEvents.push({
      timestamp: new Date().toISOString(),
      action,
      actor,
      details
    });
  }
}

// Direct execution
if (require.main === module) {
  const server = new CloudControlPlaneServer();
  server.start().then((port) => {
    console.log(`[DECK Cloud Control Plane] Running on http://localhost:${port}`);
  }).catch((err) => {
    console.error('[DECK Cloud Control Plane] Failed to start:', err);
    process.exit(1);
  });
}
