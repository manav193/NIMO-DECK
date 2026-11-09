export interface IDashboardTransport {
  /**
   * Invokes an asynchronous RPC call across the transport boundary.
   */
  invoke<TRequest = unknown, TResponse = unknown>(
    channel: string,
    payload?: TRequest
  ): Promise<TResponse>;

  /**
   * Subscribes to real-time events emitted by the platform daemon or server.
   * Returns an unsubscribe cleanup callback.
   */
  subscribe<TEvent = unknown>(
    event: string,
    handler: (data: TEvent) => void
  ): () => void;

  /**
   * Indicates whether the transport currently has a live connection.
   */
  isAvailable(): boolean;

  /**
   * Returns the transport type ('ipc' | 'http' | 'mock').
   */
  getTransportType(): 'ipc' | 'http' | 'mock';
}
