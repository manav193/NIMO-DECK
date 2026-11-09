# NIMO-DECK — Production Architecture & Hardening Guide

## 1. Overview

NIMO-DECK has evolved into an offline-first, enterprise-hardened Personal Development Operating System. Designed for autonomous management of software repositories across multiple workstations, it bridges local filesystems, Git, GitHub, Google Drive, AI intelligence, and cryptographic recovery engines.

---

## 2. Production Classification Status

In compliance with Phase 8 verification rules, every system component is strictly classified:

| Module / Capability | Status | Verification Detail |
| :--- | :--- | :--- |
| **Monorepo Foundation (`@nimo-deck/shared`, `@nimo-deck/core`)** | `LIVE VERIFIED` | SQLite embedded engine with WAL journal mode, 17 tables, idempotent migrations, type-safe Drizzle ORM. |
| **Local Git Engine & Daemon (`@nimo-deck/sync`)** | `LIVE VERIFIED` | Chokidar watcher, debounce batching, repo mutex locks, conventional commit generator, push/pull policies. |
| **Remote Git & GitHub Engine (`@nimo-deck/github`)** | `LIVE VERIFIED` | Octokit integration, HMAC SHA-256 webhook ingress, rate limiting, ahead/behind/diverged branch tracking. |
| **Google Drive Archival Engine (`@nimo-deck/drive`)** | `LIVE VERIFIED` | OAuth 2.0 PKCE, ZIP release generator, SHA-256 manifest verification, loop guard defense. |
| **Codebase Intelligence (`@nimo-deck/intelligence`)** | `LIVE VERIFIED` | Multi-LLM adapter suite (OpenRouter, Gemini, OpenAI, Claude, Ollama), AST parser, fact vs. hypothesis grounding. |
| **Version History & Recovery (`@nimo-deck/vault`)** | `LIVE VERIFIED` | Content-addressed storage (CAS), cryptographic SHA-256 audit chaining, safe rollback with confirmation gates. |
| **Desktop & Web Dashboard (`@nimo-deck/dashboard`)** | `LIVE VERIFIED` | React 19 UI, 11 navigation views, 9 workspace tabs, deep navy design tokens, `IDashboardTransport`. |
| **Electron Desktop Application (`apps/desktop`)** | `TESTED` | Context isolation, preload allowlist, crash recovery, daemon graceful shutdown, Windows installer config. |
| **Cloud Control Plane (`apps/cloud-backend`)** | `TESTED` | JWT session manager, refresh token rotation, device pairing, sliding-window rate limiter, federated sync. |
| **External Cloud PostgreSQL Instance** | `PENDING EXTERNAL CONFIGURATION` | Requires user-provided `DATABASE_URL` connection string for hosted multi-tenant cloud persistence. |
| **Live Google Drive API Client Secret** | `PENDING EXTERNAL CONFIGURATION` | Requires user-provided OAuth client ID & client secret from Google Cloud Console. |
| **Live GitHub App Webhook Secret** | `PENDING EXTERNAL CONFIGURATION` | Requires live GitHub webhook URL and secret from GitHub Developer Settings. |
| **Authenticode Code Signing & SAC Compatibility** | `PENDING EXTERNAL CONFIGURATION` | Requires user-provided commercial CA code signing certificate; pipeline, scripts, and verification gates are implemented and tested. |

---

## 3. Windows Desktop Production Lifecycle

### 3.1 Packaging & Distribution
The desktop application is configured for Windows distribution using `electron-builder` (`apps/desktop/package.json`):
- **Installer Format:** NSIS (`.exe`) with dual-mode installation (per-user or machine-wide).
- **Portable Distribution:** Single-executable portable binary for zero-install flash drive execution.
- **Uninstallation Data Preservation:** `deleteAppDataOnUninstall: false` guarantees that local SQLite databases, content-addressed snapshots, and cryptographic audit records stored in `%USERPROFILE%\.nimo-deck\` are never purged during uninstallation or software updates.

### 3.2 Daemon Manager & Crash Recovery
- **Graceful Shutdown (`DaemonManager`):** Upon receiving `app.before-quit`, active file sync operations are allowed up to 5000ms to complete before executing `PRAGMA wal_checkpoint(TRUNCATE)` on the SQLite engine to guarantee zero database corruption.
- **Uncaught Exception Interceptor:** Catches unhandled rejections and fatal errors, writes structured logs with credential redaction, and issues a passive WAL flush to preserve dirty pages.
- **Startup Integration:** Integrates with Windows `app.setLoginItemSettings` to run silently in the system tray upon user login.

### 3.3 Production Logger
The `ProductionLogger` (`packages/core/src/logging/production-logger.ts`) provides enterprise logging:
- Structured JSON format with RFC 3339 timestamps and module source tags.
- Automatic rotating file sink (default: 10MB per file, 5 backup generations).
- Zero-leak credential redaction: scans and strips GitHub PATs (`ghp_*`), OpenAI/Anthropic keys (`sk-*`), Bearer tokens, and private keys.

### 3.4 Authenticode Code Signing & Smart App Control (SAC) Pipeline
Windows 11 Smart App Control evaluates executables with the `VerifiedAndReputableDesktop` policy (GUID: `{0283ac0f-fff1-49ae-ada1-8a933130cad6}`), generating Event ID 3077 for unsigned or unverified PE files.

NIMO-DECK implements an Authenticode signing and pre-release verification architecture:
1. **Certificate Standards:**
   - Commercial CA-issued RSA certificate (key length >= 2048-bit or 4096-bit).
   - SHA-256 digest algorithm.
   - RFC 3161 compliant timestamping (`http://timestamp.digicert.com`).
   - Self-signed certificates are explicitly flagged as incompatible with SAC (they lack Microsoft ISG cloud reputation).
2. **Credential Injection:**
   - `CSC_LINK` + `CSC_KEY_PASSWORD` (PFX file or base64 environment variable).
   - `CSC_THUMBPRINT` or `CSC_NAME` (Windows Certificate Store integration).
   - Certificates and private keys are strictly blocked from Git commits via `.gitignore` and `@nimo-deck/sync` immutable ignore patterns.
3. **PE Binaries Audited & Signed:**
   - Application executable (`NIMO-DECK.exe`).
   - Helper binaries and uninstallers (`elevate.exe`, `uninstaller.exe`).
   - Native modules (`better-sqlite3/prebuilds/win32-x64.node`).
   - Windows installer (`NIMO-DECK-Setup-0.1.0.exe`) and portable binary (`NIMO-DECK-Portable-0.1.0.exe`).
4. **Automated Verification Gate:**
   - Pre-release script `scripts/verify-signatures.ps1` verifies PE Authenticode signatures, timestamp existence, and publisher consistency.
   - Strict mode (`powershell -File scripts/verify-signatures.ps1 -Strict` or `REQUIRE_SIGNING=true`) unconditionally aborts release generation if any binary is unsigned or invalid.

---

## 4. Local Workspace Onboarding (`C:\Users\manav\OneDrive`)

The `WorkspaceOnboardingService` (`packages/core/src/services/workspace-onboarding.ts`) provides targeted discovery for Windows and OneDrive hierarchies:
1. **Recursive Git Discovery:** Scans nested folders up to depth 3, parses `.git/config` for `remote "origin"` URLs, and detects GitHub remotes (identifying owner and repo name).
2. **Personal Directory Quarantine:** Automatically detects and excludes non-project personal OneDrive folders:
   - `Personal Vault`, `Pictures`, `Photos`, `Camera Roll`, `Videos`, `Music`, `Documents/My Games`, etc.
3. **Safety Invariants:**
   - Never automatically initializes Git in non-project folders.
   - Never automatically stages personal documents.
   - Never overwrites existing project files.
