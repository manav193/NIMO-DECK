import type { IDashboardTransport } from './transport.js';

export interface HttpTransportOptions {
  baseUrl?: string;
  authToken?: string;
}

export class HttpDashboardTransport implements IDashboardTransport {
  private baseUrl: string;
  private authToken?: string;
  private eventListeners: Map<string, Set<(data: unknown) => void>> = new Map();

  constructor(options: HttpTransportOptions = {}) {
    this.baseUrl = options.baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    this.authToken = options.authToken;
  }

  isAvailable(): boolean {
    return typeof fetch !== 'undefined';
  }

  getTransportType(): 'http' {
    return 'http';
  }

  setAuthToken(token?: string) {
    this.authToken = token;
  }

  async invoke<TRequest = unknown, TResponse = unknown>(
    channel: string,
    payload?: TRequest
  ): Promise<TResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const res = await fetch(`${this.baseUrl}/api/deck/rpc`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        channel,
        payload
      })
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(
        (errBody as { message?: string }).message ||
          `[HttpDashboardTransport] Request failed with HTTP ${res.status}: ${res.statusText}`
      );
    }

    const data = await res.json();
    return data as TResponse;
  }

  subscribe<TEvent = unknown>(
    event: string,
    handler: (data: TEvent) => void
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    const handlers = this.eventListeners.get(event)!;
    const casted = handler as (data: unknown) => void;
    handlers.add(casted);

    return () => {
      handlers.delete(casted);
    };
  }

  // Internal dispatch helper for SSE / WebSocket integration
  dispatchLocalEvent(event: string, data: unknown) {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach((h) => h(data));
    }
  }
}
