import { describe, it, expect, vi } from 'vitest';
import { MockDashboardTransport } from '../src/services/mock-transport.js';
import { HttpDashboardTransport } from '../src/services/http-transport.js';
import { IpcDashboardTransport } from '../src/services/ipc-transport.js';
import { IPCChannels } from '@nimo-deck/shared';

describe('Dashboard Transports', () => {
  describe('MockDashboardTransport', () => {
    it('is always available in mock mode', () => {
      const mock = new MockDashboardTransport();
      expect(mock.isAvailable()).toBe(true);
      expect(mock.getTransportType()).toBe('mock');
    });

    it('invokes channels with simulated latency and return values', async () => {
      const mock = new MockDashboardTransport();
      const stats = await mock.invoke<unknown, { totalProjects: number }>(IPCChannels.SYSTEM_GET_OVERVIEW);
      expect(stats.totalProjects).toBeGreaterThan(0);
    });

    it('subscribes to and receives dispatched local events', () => {
      const mock = new MockDashboardTransport();
      const listener = vi.fn();
      const unsubscribe = mock.subscribe(IPCChannels.EVENT_NOTIFICATION, listener);

      mock.dispatchLocalEvent(IPCChannels.EVENT_NOTIFICATION, { id: 'evt-1' });
      expect(listener).toHaveBeenCalledWith({ id: 'evt-1' });

      unsubscribe();
      mock.dispatchLocalEvent(IPCChannels.EVENT_NOTIFICATION, { id: 'evt-2' });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('HttpDashboardTransport', () => {
    it('reports availability based on global fetch', () => {
      const transport = new HttpDashboardTransport({ baseUrl: 'http://localhost:3000' });
      expect(transport.isAvailable()).toBe(typeof fetch !== 'undefined');
      expect(transport.getTransportType()).toBe('http');
    });

    it('correctly sets authorization headers', () => {
      const transport = new HttpDashboardTransport();
      transport.setAuthToken('secret-bearer-token');
      expect(transport.getTransportType()).toBe('http');
    });
  });

  describe('IpcDashboardTransport', () => {
    it('returns false when window.deckAPI is absent', () => {
      const transport = new IpcDashboardTransport();
      expect(transport.isAvailable()).toBe(false);
      expect(transport.getTransportType()).toBe('ipc');
    });

    it('delegates to window.deckAPI when present', async () => {
      const fakeDeckAPI = {
        isElectron: true,
        invoke: vi.fn().mockResolvedValue({ id: '123' }),
        on: vi.fn().mockReturnValue(() => {})
      };

      (globalThis as unknown as { window: { deckAPI: typeof fakeDeckAPI } }).window = {
        deckAPI: fakeDeckAPI
      };

      const transport = new IpcDashboardTransport();
      expect(transport.isAvailable()).toBe(true);

      const res = await transport.invoke('test:channel', { foo: 'bar' });
      expect(res).toEqual({ id: '123' });
      expect(fakeDeckAPI.invoke).toHaveBeenCalledWith('test:channel', { foo: 'bar' });

      // Clean up global
      delete (globalThis as unknown as { window?: unknown }).window;
    });
  });
});
