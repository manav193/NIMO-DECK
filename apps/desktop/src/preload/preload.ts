import { contextBridge, ipcRenderer } from 'electron';
import { IPCChannels } from '@nimo-deck/shared';

// Strict Allowlist of permitted IPC channels
const ALLOWED_CHANNELS = new Set<string>([
  ...Object.values(IPCChannels),
  'notifications:list',
  'notifications:markRead'
]);

// Expose safe, context-isolated API to the renderer process
contextBridge.exposeInMainWorld('deckAPI', {
  isElectron: true,

  invoke: async <TRequest = unknown, TResponse = unknown>(
    channel: string,
    payload?: TRequest
  ): Promise<TResponse> => {
    if (!ALLOWED_CHANNELS.has(channel)) {
      throw new Error(`[Security Sandbox] IPC channel '${channel}' is not in the allowed channel list.`);
    }

    const envelope = {
      id: crypto.randomUUID(),
      channel,
      payload,
      timestamp: Date.now()
    };

    const res = await ipcRenderer.invoke(channel, envelope);
    if (!res.success && res.error) {
      throw new Error(res.error.message || `IPC call to '${channel}' failed.`);
    }
    return res.data as TResponse;
  },

  on: <TEvent = unknown>(
    event: string,
    handler: (data: TEvent) => void
  ): (() => void) => {
    if (!ALLOWED_CHANNELS.has(event)) {
      throw new Error(`[Security Sandbox] Subscription channel '${event}' is not permitted.`);
    }

    const subscription = (_: unknown, data: TEvent) => handler(data);
    ipcRenderer.on(event, subscription);

    return () => {
      ipcRenderer.removeListener(event, subscription);
    };
  }
});
