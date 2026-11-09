import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DeckWebServer } from '../src/server.js';
import { IPCChannels } from '@nimo-deck/shared';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

describe('DeckWebServer API Server', () => {
  let server: DeckWebServer;
  let port: number;
  let testDbPath: string;
  let tempDir: string;
  const testToken = 'test-secret-token-123';

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), `deck-web-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    testDbPath = path.join(tempDir, 'test.sqlite');

    server = new DeckWebServer({
      port: 0, // OS assigns random available port
      host: '127.0.0.1',
      authToken: testToken,
      dbPath: testDbPath
    });

    port = await server.start();
  });

  afterAll(async () => {
    await server.stop();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('responds with 200 OK on /health without requiring auth', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);

    const body = await res.json() as { status: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('rejects unauthenticated RPC requests when authToken is configured', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/deck/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: IPCChannels.SYSTEM_GET_OVERVIEW })
    });

    expect(res.status).toBe(401);
  });

  it('rejects RPC requests with invalid bearer token', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/deck/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer wrong-token'
      },
      body: JSON.stringify({ channel: IPCChannels.SYSTEM_GET_OVERVIEW })
    });

    expect(res.status).toBe(401);
  });

  it('executes valid authenticated RPC request and returns overview stats', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/deck/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({ channel: IPCChannels.SYSTEM_GET_OVERVIEW })
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { totalProjects: number; activeProjects: number };
    expect(body.totalProjects).toBeGreaterThanOrEqual(0);
  });

  it('executes SETTINGS_GET RPC request successfully', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/deck/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({ channel: IPCChannels.SETTINGS_GET })
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { general: { theme: string } };
    expect(body.general.theme).toBe('dark');
  });
});
