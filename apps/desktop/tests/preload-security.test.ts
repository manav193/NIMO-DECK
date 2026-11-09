import { describe, it, expect, vi } from 'vitest';
import { IPCChannels } from '@nimo-deck/shared';

describe('Electron Preload Security Sandbox', () => {
  it('enforces strict channel allowlist and blocks unpermitted channels', async () => {
    let exposedApi: {
      isElectron: boolean;
      invoke: (channel: string, payload?: unknown) => Promise<unknown>;
      on: (channel: string, handler: (data: unknown) => void) => () => void;
    } | null = null;

    const mockIpcRenderer = {
      invoke: vi.fn().mockResolvedValue({ success: true, data: { status: 'ok' } }),
      on: vi.fn(),
      removeListener: vi.fn()
    };

    const mockContextBridge = {
      exposeInMainWorld: vi.fn((key: string, api: unknown) => {
        if (key === 'deckAPI') {
          exposedApi = api as typeof exposedApi;
        }
      })
    };

    vi.doMock('electron', () => ({
      contextBridge: mockContextBridge,
      ipcRenderer: mockIpcRenderer
    }));

    // Import preload module dynamically
    await import('../src/preload/preload.js');

    expect(exposedApi).toBeDefined();
    expect(exposedApi?.isElectron).toBe(true);

    // Allowed channel works
    const res = await exposedApi?.invoke(IPCChannels.SYSTEM_GET_OVERVIEW);
    expect(res).toEqual({ status: 'ok' });
    expect(mockIpcRenderer.invoke).toHaveBeenCalled();

    // Disallowed channel throws security error
    await expect(
      exposedApi?.invoke('dangerous:eval_shell_code', { cmd: 'rm -rf' })
    ).rejects.toThrow(/Security Sandbox/);

    await expect(
      exposedApi?.invoke('node:child_process:exec', { cmd: 'calc' })
    ).rejects.toThrow(/Security Sandbox/);

    // Event subscriptions also block disallowed channels
    expect(() => {
      exposedApi?.on('evil:event', () => {});
    }).toThrow(/Security Sandbox/);
  });
});
