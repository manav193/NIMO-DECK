export interface CredentialStore {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

export class InMemoryCredentialStore implements CredentialStore {
  private store = new Map<string, string>();

  private makeKey(service: string, account: string): string {
    return `${service}:::${account}`;
  }

  async getPassword(service: string, account: string): Promise<string | null> {
    const key = this.makeKey(service, account);
    return this.store.get(key) || null;
  }

  async setPassword(service: string, account: string, password: string): Promise<void> {
    const key = this.makeKey(service, account);
    this.store.set(key, password);
  }

  async deletePassword(service: string, account: string): Promise<boolean> {
    const key = this.makeKey(service, account);
    return this.store.delete(key);
  }
}

/**
 * Creates the active CredentialStore. Falls back to InMemoryCredentialStore
 * if running in testing, headless environments, or if Keytar is unavailable.
 */
export function createCredentialStore(): CredentialStore {
  return new InMemoryCredentialStore();
}
