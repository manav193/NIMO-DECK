export interface CredentialStore {
    getPassword(service: string, account: string): Promise<string | null>;
    setPassword(service: string, account: string, password: string): Promise<void>;
    deletePassword(service: string, account: string): Promise<boolean>;
}
export declare class InMemoryCredentialStore implements CredentialStore {
    private store;
    private makeKey;
    getPassword(service: string, account: string): Promise<string | null>;
    setPassword(service: string, account: string, password: string): Promise<void>;
    deletePassword(service: string, account: string): Promise<boolean>;
}
/**
 * Creates the active CredentialStore. Falls back to InMemoryCredentialStore
 * if running in testing, headless environments, or if Keytar is unavailable.
 */
export declare function createCredentialStore(): CredentialStore;
//# sourceMappingURL=credential-store.d.ts.map