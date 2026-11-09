# NIMO-DECK — Desktop Application & Electron Gateway

## 1. Overview

`apps/desktop` is the native desktop distribution of the NIMO-DECK Personal Development Operating System. Built with Electron and TypeScript, it pairs the shared React 19 UI with a robust native backend that directly hosts SQLite databases, Git processes, background filesystem watchers, and cryptographic vault engines.

---

## 2. Process Architecture & Sandboxing

```
┌────────────────────────────────────────────────────────┐
│               ELECTRON MAIN PROCESS                    │
│  - Runtime Composition (SQLite, Vault, AI, EventBus)   │
│  - IPC Gateway with Zod Schema Validation             │
│  - Window Management & System Tray Integration         │
└──────────────────────────┬─────────────────────────────┘
                           │ Strict IPC (Allowlist only)
                           ▼
┌────────────────────────────────────────────────────────┐
│               SECURE PRELOAD BRIDGE                    │
│  - contextBridge.exposeInMainWorld('deckAPI', ...)     │
│  - Zero Node.js Builtins Leaked to Window             │
└──────────────────────────┬─────────────────────────────┘
                           │ contextIsolated: true
                           ▼
┌────────────────────────────────────────────────────────┐
│             RENDERER PROCESS (REACT 19)                │
│  - @nimo-deck/dashboard Shared Command Center         │
│  - IpcDashboardTransport (window.deckAPI)             │
│  - Sandboxed DOM & Secure Navigation Guards            │
└────────────────────────────────────────────────────────┘
```

### Security Sandboxing Enforcements

1. **Strict Context Isolation**: `contextIsolation: true` and `nodeIntegration: false` prevent renderer scripts from executing Node.js primitives or accessing native filesystems directly.
2. **Preload Channel Allowlist**: `apps/desktop/src/preload/preload.ts` maintains a closed set of permitted IPC channels (`ALLOWED_CHANNELS`). Calls to unlisted channels are instantly rejected with security exceptions.
3. **External URL Guard**: The `will-navigate` and `setWindowOpenHandler` event listeners intercept external links and route them safely to the user's default system browser using `shell.openExternal()`. No untrusted web content is ever evaluated in the internal Electron renderer.
4. **Zod Validation on Main Process**: Every IPC request envelope (`IPCRequestSchema`) is validated on arrival before dispatching to business logic, preventing malformed payload injection.

---

## 3. Desktop Runtime Composition

The `DesktopRuntime` class (`src/main/runtime.ts`) initializes and coordinates the backend subsystems:
- **Application Data Directory**: Stored in `~/.nimo-deck/` with automatic directory creation.
- **SQLite Database**: Managed by `better-sqlite3` and `drizzle-orm` with automated migrations executed on startup.
- **Vault Engine**: Instantiates `DeckVaultEngine` pointing to `~/.nimo-deck/vault` with content-addressed storage (CAS) and append-only audit verification.
- **AI Intelligence Engine**: Configures `DeckIntelligenceEngine` with the multi-provider registry (`ProviderRegistry`) supporting OpenRouter, Gemini, OpenAI, Claude, and Ollama.
- **Event Bus**: In-memory event dispatcher (`DeckEventBus`) propagating background Git changes and alert events to the IPC gateway.

---

## 4. IPC Gateway

The `IPCGateway` (`src/main/ipc-gateway.ts`) registers strongly typed handlers for all channels defined in `@nimo-deck/shared`:

```typescript
this.handle(IPCChannels.VAULT_VERIFY_CHAIN, async (payload) => {
  const p = payload as { projectId?: string } | undefined;
  return this.runtime.vaultEngine.verifyAuditChain(p?.projectId);
});
```

All IPC handlers return an `IPCResponse` envelope:
```typescript
interface IPCResponse<T = unknown> {
  id: string;
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  durationMs: number;
}
```

---

## 5. Development & Launching

### Build Desktop Application
```bash
npm run build --workspace=@nimo-deck/desktop
```

### Run Native Desktop Command Center
```bash
npm start --workspace=@nimo-deck/desktop
```
This launches the Electron desktop shell with native dark titlebars, tray management, and context-isolated UI.
