# NIMO-DECK Engineering Implementation Roadmap

## 1. Roadmap Architecture & Phasing Strategy

NIMO-DECK is built in an incremental, test-driven manner across eight distinct engineering phases. Each phase establishes a verified, production-grade module with unit and integration tests before subsequent layers are integrated.

```mermaid
gantt
    title NIMO-DECK Phase-Wise Implementation Roadmap
    dateFormat  YYYY-MM-DD
    section Phase 1
    Monorepo & Core Infrastructure       :p1, 2026-11-09, 10d
    section Phase 2
    DECK SYNC (File Watcher & Git Engine):p2, after p1, 14d
    section Phase 3
    DECK GITHUB (Discovery & Webhooks)   :p3, after p2, 10d
    section Phase 4
    DECK DRIVE (Snapshots & Loop Guard)  :p4, after p3, 12d
    section Phase 5
    DECK INTELLIGENCE (Multi-LLM Engine) :p5, after p4, 14d
    section Phase 6
    DECK VAULT (Audit Chain & Recovery)  :p6, after p5, 8d
    section Phase 7
    DECK DASHBOARD (Electron + React 19) :p7, after p6, 16d
    section Phase 8
    Production Hardening & Packaging     :p8, after p7, 10d
```

---

## 2. Detailed Phase Breakdown

### Phase 1: Monorepo Foundation & Core Infrastructure
**Status:** `[COMPLETED]` (Verified: 2026-11-09)

**Primary Objectives:**
Establish the monorepo structure, TypeScript configuration, package boundary definitions, shared schemas, cryptographic utilities, and embedded SQLite database engine.

- **Tasks Completed:**
  - [x] Configure root `package.json` with npm workspaces (`packages/*`), TypeScript 5.7, ESLint 9, and Vitest.
  - [x] Implement `@nimo-deck/shared`:
    - [x] Common Zod schemas (`Project`, `SyncConfig`, `CommitRecord`, `RemoteSyncState`, `DriveBackup`, `AIRecommendation`, `AIAnalysis`, `AIRoadmap`, `AuditLogEntry`).
    - [x] Cryptographic utilities: Shannon entropy calculation, high-confidence secret detection regexes, SHA-256 payload hashing, tamper-evident audit hash-chain calculator.
    - [x] Immutable ignore patterns (`IMMUTABLE_IGNORED_PATTERNS`, `isImmutableIgnored`).
    - [x] Typed IPC request, response, error envelopes and standard channel constants.
  - [x] Implement `@nimo-deck/core`:
    - [x] Embedded SQLite connection with Drizzle ORM, WAL journal mode, and foreign key enforcement.
    - [x] Idempotent migration runner (`runMigrations`) creating 11 core tables and composite indexes.
    - [x] Clean architecture repositories: `ProjectRepository`, `SyncConfigRepository`, `SyncEventRepository`, `CommitHistoryRepository`, `RemoteSyncStateRepository`, `AIAnalysisRepository`.
    - [x] Cryptographic `AuditLogRepository` with SHA-256 hash chaining and automated tamper-detection validator (`verifyChainIntegrity`).
    - [x] Typed event bus (`DeckEventBus` using `EventEmitter3`).
    - [x] Credential store abstraction (`CredentialStore`, `InMemoryCredentialStore`).
- **Verification Gate:**
  - [x] 100% test pass rate: 7 test suites, 29 unit and integration tests passing (`npm test`).
  - [x] Zero TypeScript errors: `npm run typecheck` across all project references.
  - [x] Clean linting: `npm run lint` with 0 errors and 0 warnings.
  - [x] Package builds: `npm run build` compiles clean `.d.ts` declaration maps and `.js` bundles.

---

### Phase 2: Local Git Engine & Background Sync Daemon (`@nimo-deck/sync`)
**Status:** `[COMPLETED]` (Verified: 2026-11-09)

**Primary Objectives:**
Implement filesystem observation, event debouncing, pre-commit secret scanning, Git CLI automation, conventional commit generation, safe push/pull logic, and multi-repository background daemon foundation.

- **Tasks Completed:**
  - [x] Implemented `GitCLI` with safe child process execution (`execFile`), argument array parameterization (zero shell injection), timeout handling, and destructive command interception (`--force`, `-f`, `clean -fd`, `--hard` prohibited).
  - [x] Implemented `GitStatusInspector` parsing machine-readable `git status --porcelain=v2 --branch` for accurate dirty-tree, branch, untracked, ahead/behind, and conflict tracking.
  - [x] Implemented `GitDiffInspector` for stat, numstat, and truncated diff summaries for AI prompt window safety.
  - [x] Implemented `GitLockMonitor` detecting stale `.git/index.lock` files (> 60s mtime) with automated orphan cleanup.
  - [x] Implemented `DebounceBatcher` with sliding quiet inactivity window (default 5s) and maximum burst ceiling timeout (`maxWaitMs`, default 30s).
  - [x] Implemented `RepoFileWatcher` wrapping `chokidar.watch` with unconditional immutable ignore rule filtering and pause/resume lifecycle.
  - [x] Implemented `PreCommitScanner` evaluating candidate files for immutable ignore patterns, 50MB file size limits, credential signatures, and Shannon entropy. Blocks and quarantines secrets before `git add`.
  - [x] Implemented `CommitMessageService` and `ConventionalCommitBuilder` inferring semantic Conventional Commit messages with monorepo package scope detection, plus an injectable `AICommitMessageGenerator` interface with graceful heuristic fallback.
  - [x] Implemented `RepoMutex` for in-memory exclusive synchronization locking per repository to prevent race conditions.
  - [x] Implemented `RetryQueue` providing exponential backoff with randomized jitter for network failures.
  - [x] Implemented `SyncCoordinator` linking mutex locks, stale lock pruning, safety scanning, staging, committing, database recording, safe pull (`--ff-only`), conflict alerting, and event emission.
  - [x] Implemented `SyncDaemonManager` orchestrating multi-repository background surveillance with start/stop/pause/resume and manual sync triggers.
- **Verification Gate:**
  - [x] 100% test pass rate: 14 test suites, 52 unit and integration tests passing (`npm test`).
  - [x] Pre-commit security verification: `.env` and high-entropy private keys quarantined and blocked from staging.
  - [x] Non-linear history divergence alert: automatic push halted on divergence without silent rebase.
  - [x] Zero TypeScript errors: `npm run typecheck` across all project references (`shared`, `core`, `sync`).
  - [x] Clean linting: `npm run lint` with 0 errors and 0 warnings.
  - [x] Clean build: `npm run build` compiling clean `.d.ts` declarations and `.js` code across all workspaces.

---

### Phase 3: GitHub Integration & Remote Orchestration (`@nimo-deck/github`)
**Status:** `[COMPLETED]` (Verified: 2026-11-09)

**Primary Objectives:**
Seamlessly integrate GitHub REST API for repository discovery, branch tracking, pull requests, issues, real-time webhook ingestion with replay protection, and repository intelligence inventories.

- **Tasks Completed:**
  - [x] Implemented `GitHubClient` with secure token resolution from `CredentialStore`, zero token exposure to frontend code, and automatic token redaction in all exceptions and error messages.
  - [x] Implemented `GitHubRateLimiter` tracking `x-ratelimit-*` headers, computing remaining quota and cooldown delays.
  - [x] Implemented `RepoUrlParser` parsing and normalizing GitHub HTTPS, SSH, and git:// URLs, enabling protocol-agnostic equivalence matching.
  - [x] Implemented `RepoMapper` reconciling local projects against discovered remote repositories (detecting mapped pairs, local-only scratch projects, and remote-only repositories).
  - [x] Implemented `GitHubWebhookHandler` validating incoming webhook signatures via timing-safe HMAC-SHA256 (`X-Hub-Signature-256`) with delivery ID caching to block replay attacks.
  - [x] Implemented `GitHubMetadataSyncer` synchronizing remote branch heads, open PRs, and issues directly into the local SQLite database (`remote_sync_states`).
  - [x] Implemented `RepositoryInventoryGenerator` providing repository intelligence, tracking inactive repositories (> 60 days), uncommitted edits, and centralized inventory metrics conforming to `RepositoryInventorySchema`.
- **Verification Gate:**
  - [x] 100% test pass rate: 21 test suites, 68 unit and integration tests passing (`npm test`).
  - [x] Token redaction verified: error messages redact `ghp_*` tokens with `[REDACTED_TOKEN]`.
  - [x] Replay attack protection verified: duplicate delivery GUIDs within TTL are blocked.
  - [x] Timing-safe HMAC-SHA256 validation verified: tampered webhook bodies are rejected.
  - [x] Zero TypeScript errors: `npm run typecheck` across all project references (`shared`, `core`, `sync`, `github`).
  - [x] Clean linting: `npm run lint` with 0 errors and 0 warnings.
  - [x] Clean build: `npm run build` compiling clean `.d.ts` declaration maps and `.js` code across all workspaces.

---

### Phase 4: Google Drive Backup & Snapshot System (`@nimo-deck/drive`)
**Status:** `[COMPLETED]` (Verified: 2026-11-09)
**Primary Objectives:**
Implement Google Drive v3 OAuth 2.0 PKCE integration, non-conflicting snapshot generation, deterministic SHA-256 fingerprinting, documentation mirroring, synchronization loop defense, and disaster restore engine.

- **Tasks Completed:**
  - [x] Implemented `OAuthHandler`: RFC 7636 PKCE authorization code flow with loopback listener (`http://127.0.0.1:4567/oauth/callback`), token exchange, and refresh token rotation via `CredentialStore`.
  - [x] Implemented `DriveClient`: Google Drive v3 REST API client managing multipart/related uploads, directory hierarchy generation (`NIMO-DECK / <project-name> / {snapshots, docs, releases}`), recursive folder lookup, and stream downloading.
  - [x] Implemented `SnapshotBuilder`: Sanitized in-memory ZIP snapshot builder excluding `.git`, `node_modules`, `dist`, `.env`, and `IMMUTABLE_IGNORED_PATTERNS`.
  - [x] Implemented `ManifestGenerator`: Deterministic SHA-256 fingerprinting across all files and generation of embedded `deck-sync-manifest.json` metadata.
  - [x] Implemented `LoopGuard`: In-memory sliding TTL token cache (default: 120s) preventing cloud-induced filesystem mutation storms.
  - [x] Implemented `DocsMirror`: Automatic scanning and mirroring of Markdown documentation (`.md`, `.mdx`) to Google Drive docs folders.
  - [x] Implemented `RestoreEngine`: Verifies file-level SHA-256 digests against manifest before write, blocks path-traversal attacks, requires explicit user confirmation (`confirmRestore: true`), and restores files safely without data loss.
  - [x] Implemented `DriveBackupService`: Coordinates snapshots, checks for duplicate content digests to avoid unnecessary uploads, and records completed backups in SQLite `drive_backups`.
- **Verification Gate:**
  - [x] 100% test pass rate: 27 test suites, 80 unit and integration tests passing (`npm test`).
  - [x] LoopGuard verified: recent tokens recognized within TTL and rejected once expired.
  - [x] Path traversal safety verified: restore engine rejects malicious relative paths (`../`).
  - [x] Checksum validation verified: corrupted archives and altered files fail restore validation.
  - [x] Duplicate upload avoidance verified: identical content hashes skip redundant Drive uploads.
  - [x] Zero TypeScript errors: `npm run typecheck` across all project references (`shared`, `core`, `sync`, `github`, `drive`).
  - [x] Clean linting: `npm run lint` with 0 errors and 0 warnings.
  - [x] Clean build: `npm run build` compiling clean `.d.ts` declaration maps and `.js` code across all workspaces.

---

### Phase 5: AI Project Intelligence Engine (`@nimo-deck/intelligence`)
**Status:** `[PENDING - NEXT]`
**Primary Objectives:**
Build a multi-provider LLM gateway, AST and project context extraction pipeline, structured cognitive outputs, and the Fact vs. Hypothesis engine.

- **Tasks:**
  1. Build `AIProviderAdapter` interface with implementations:
     - OpenRouter (Default gateway).
     - Google Gemini (Direct API).
     - OpenAI & Anthropic (Direct APIs).
     - Ollama (Local offline model).
  2. Implement `ContextExtractor`:
     - Directory tree serializer.
     - Dependency manifest parser (`package.json`, `Cargo.toml`, etc.).
     - README and markdown extractor.
     - Git commit history analyzer.
  3. Implement cognitive analysis pipelines:
     - Project summary & architectural pattern recognition.
     - Technical debt & security vulnerability audit.
     - Dynamic roadmap synthesizer with complexity & dependencies.
  4. Implement `FactHypothesisClassifier`:
     - Enforces deterministic tagging (`VERIFIED_FACT` vs `AI_HYPOTHESIS`).
- **Verification Gate:**
  - Mocked LLM responses validated against Zod schemas ensuring no hallucinated or unformatted fields.

---

### Phase 6: Vault, Audit Logs & Disaster Recovery (`@nimo-deck/vault`)
**Primary Objectives:**
Provide an immutable, tamper-evident audit log and lightweight local diff snapshot recovery.

- **Tasks:**
  1. Implement `AuditLogger` with cryptographic SHA-256 hash chaining.
  2. Implement local delta snapshot manager (temporary git stash patches).
  3. Build changelog generator from Git commit streams.
  4. Implement safe rollback coordinator.
- **Verification Gate:**
  - Test verifying that any manual tampering with an audit log row invalidates the chain validation check.

---

### Phase 7: Modern Desktop & Web Dashboard (`@nimo-deck/dashboard`)
**Primary Objectives:**
Create a modern, responsive, developer-oriented Electron desktop application and web interface using React 19 and Tailwind CSS.

- **Tasks:**
  1. Configure Electron main process with context-isolated preload scripts and safe IPC channels.
  2. Scaffolding React 19 app with Tailwind CSS, Lucide icons, and Radix primitives.
  3. Implement 11 core dashboard views:
     - **Overview:** System health, active sync daemons, quick stats.
     - **Projects:** Card and table views of managed repositories.
     - **Repository Explorer:** Virtualized file tree, diff inspector, branch switcher.
     - **Activity Timeline:** Real-time stream of Git actions and Drive backups.
     - **GitHub Synchronization:** Remote branches, PRs, issues, divergence alerts.
     - **Google Drive:** Snapshot catalog, manual snapshot trigger, restore point manager.
     - **AI Intelligence:** Project summaries, architecture insights, debt audits.
     - **Development Roadmaps:** Interactive milestone view with status toggles.
     - **Project History:** Commit logs, author analytics, changelogs.
     - **Backups & Recovery:** Local stashes, Drive archives, integrity verification.
     - **Settings & Security:** Provider API keys, debounce sliders, ignore rule editor.
  4. Real-time push updates from DECK Core via IPC events.
- **Verification Gate:**
  - Component tests, rendering benchmarks (< 16ms frame budget), and IPC channel security audits.

---

### Phase 8: Multi-Device Sync, Production Hardening & Packaging
**Primary Objectives:**
Package NIMO-DECK for Windows distribution, harden performance, conduct security penetration tests, and verify multi-device metadata synchronization.

- **Tasks:**
  1. Build Windows installer (.exe / .msi) using Electron Forge or Electron Builder.
  2. Implement optional central PostgreSQL sync adapter for multi-workstation setups.
  3. System resource profiling: idle RAM < 120MB, CPU < 1% when monitoring 20+ repos.
  4. Comprehensive documentation and release tagging on GitHub (`v1.0.0`).
- **Verification Gate:**
  - End-to-end installation test on clean Windows environment.
  - Stress test monitoring 25 active repositories simultaneously.
