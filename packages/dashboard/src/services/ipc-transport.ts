import type { IDashboardTransport } from './transport.js';

export interface ElectronDeckAPI {
  invoke: <TRequest = unknown, TResponse = unknown>(
    channel: string,
    payload?: TRequest
  ) => Promise<TResponse>;
  on: <TEvent = unknown>(
    event: string,
    handler: (data: TEvent) => void
  ) => () => void;
  isElectron: boolean;
}

declare global {
  interface Window {
    deckAPI?: ElectronDeckAPI;
  }
}

export class IpcDashboardTransport implements IDashboardTransport {
  isAvailable(): boolean {
    return typeof window !== 'undefined' && Boolean(window.deckAPI?.isElectron);
  }

  getTransportType(): 'ipc' {
    return 'ipc';
  }

  async invoke<TRequest = unknown, TResponse = unknown>(
    channel: string,
    payload?: TRequest
  ): Promise<TResponse> {
    if (!this.isAvailable()) {
      throw new Error(
        `[IpcDashboardTransport] Electron context bridge (window.deckAPI) unavailable. Unable to dispatch '${channel}'.`
      );
    }
    return window.deckAPI!.invoke<TRequest, TResponse>(channel, payload);
  }

  subscribe<TEvent = unknown>(
    event: string,
    handler: (data: TEvent) => void
  ): () => void {
    if (!this.isAvailable()) {
      return () => {};
    }
    return window.deckAPI!.on<TEvent>(event, handler);
  }
}
