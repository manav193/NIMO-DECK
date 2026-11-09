"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryCredentialStore = void 0;
exports.createCredentialStore = createCredentialStore;
class InMemoryCredentialStore {
    store = new Map();
    makeKey(service, account) {
        return `${service}:::${account}`;
    }
    async getPassword(service, account) {
        const key = this.makeKey(service, account);
        return this.store.get(key) || null;
    }
    async setPassword(service, account, password) {
        const key = this.makeKey(service, account);
        this.store.set(key, password);
    }
    async deletePassword(service, account) {
        const key = this.makeKey(service, account);
        return this.store.delete(key);
    }
}
exports.InMemoryCredentialStore = InMemoryCredentialStore;
/**
 * Creates the active CredentialStore. Falls back to InMemoryCredentialStore
 * if running in testing, headless environments, or if Keytar is unavailable.
 */
function createCredentialStore() {
    return new InMemoryCredentialStore();
}
//# sourceMappingURL=credential-store.js.map