import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IPCGateway } from '../src/main/ipc-gateway.js';
import { IPCChannels } from '@nimo-deck/shared';
import type { DesktopRuntime } from '../src/main/runtime.js';

// Mock electron
const handlers: Record<string, (event: unknown, request: unknown) => Promise<unknown>> = {};

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (event: unknown, request: unknown) => Promise<unknown>) => {
      handlers[channel] = handler;
    })
  }
}));

describe('Desktop IPCGateway', () => {
  let mockRuntime: DesktopRuntime;
  let gateway: IPCGateway;

  beforeEach(() => {
    mockRuntime = {
      projectRepo: {
        listAll: vi.fn().mockReturnValue([
          { id: 'proj-1', name: 'NIMO-DECK', status: 'ACTIVE', localPath: 'C:\\test' }
        ]),
        getById: vi.fn((id: string) => ({ id, name: 'NIMO-DECK', status: 'ACTIVE', localPath: 'C:\\test' })),
        create: vi.fn((data: unknown) => ({ id: 'new-id', ...(data as object) }))
      },
      remoteSyncRepo: {
        listByProject: vi.fn().mockReturnValue([])
      },
      aiRepo: {
        listRecommendationsByProject: vi.fn().mockReturnValue([]),
        listCrossProjectInsights: vi.fn().mockReturnValue([])
      },
      memoryRepo: {
        getMemoryByProject: vi.fn().mockReturnValue({ decisions: [], conventions: [] })
      },
      vaultEngine: {
        listSnapshots: vi.fn().mockResolvedValue([]),
        verifyAuditChain: vi.fn().mockResolvedValue({ valid: true, verifiedCount: 10 }),
        getTimeline: vi.fn().mockResolvedValue([]),
        generateChangelog: vi.fn().mockResolvedValue({ markdown: '# Changelog' })
      },
      intelligenceEngine: {
        analyzeProject: vi.fn().mockResolvedValue({ summary: 'Analyzed' })
      },
      db: {} as unknown
    } as unknown as DesktopRuntime;

    gateway = new IPCGateway(mockRuntime);
    gateway.registerHandlers();
  });

  it('registers handlers for core IPC channels', () => {
    expect(handlers[IPCChannels.SYSTEM_GET_OVERVIEW]).toBeDefined();
    expect(handlers[IPCChannels.PROJECT_LIST]).toBeDefined();
    expect(handlers[IPCChannels.PROJECT_GET]).toBeDefined();
    expect(handlers[IPCChannels.VAULT_VERIFY_CHAIN]).toBeDefined();
    expect(handlers[IPCChannels.SETTINGS_GET]).toBeDefined();
  });

  it('processes SYSTEM_GET_OVERVIEW with valid response format', async () => {
    const handler = handlers[IPCChannels.SYSTEM_GET_OVERVIEW];
    const rawReq = {
      id: 'a0000000-0000-0000-0000-000000000001',
      channel: IPCChannels.SYSTEM_GET_OVERVIEW,
      payload: {},
      timestamp: Date.now()
    };

    const res = await handler({}, rawReq) as { success: boolean; data: { totalProjects: number }; durationMs: number };
    expect(res.success).toBe(true);
    expect(res.data.totalProjects).toBe(1);
    expect(typeof res.durationMs).toBe('number');
  });

  it('handles PROJECT_GET with parsed payload', async () => {
    const handler = handlers[IPCChannels.PROJECT_GET];
    const rawReq = {
      id: 'a0000000-0000-0000-0000-000000000002',
      channel: IPCChannels.PROJECT_GET,
      payload: { id: 'proj-123' },
      timestamp: Date.now()
    };

    const res = await handler({}, rawReq) as { success: boolean; data: { id: string } };
    expect(res.success).toBe(true);
    expect(res.data.id).toBe('proj-123');
    expect(mockRuntime.projectRepo.getById).toHaveBeenCalledWith('proj-123');
  });

  it('safely catches errors and returns structured IPCError', async () => {
    (mockRuntime.projectRepo.getById as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('Database disk I/O error');
    });

    const handler = handlers[IPCChannels.PROJECT_GET];
    const rawReq = {
      id: 'a0000000-0000-0000-0000-000000000003',
      channel: IPCChannels.PROJECT_GET,
      payload: { id: 'bad-proj' },
      timestamp: Date.now()
    };

    const res = await handler({}, rawReq) as { success: boolean; error: { code: string; message: string } };
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('IPC_HANDLER_ERROR');
    expect(res.error.message).toContain('Database disk I/O error');
  });
});
