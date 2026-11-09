# NIMO-DECK Sync Engine Specification

## 1. Overview & Core Mission

**DECK SYNC (`@nimo-deck/sync`)** is an autonomous, background-capable filesystem synchronization and Git management engine. Its primary objective is to maintain a seamless, continuous, and safe stream of commits and remote synchronizations across monitored developer repositories without interrupting active coding sessions or risking data loss.

---

## 2. Synchronization State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle

    state "Idle & Monitoring" as Idle
    state "Debouncing & Coalescing" as Debounce
    state "Pre-Commit Validation" as Validate
    state "Staging & Commit Creation" as Commit
    state "Remote Health & Fetch Check" as FetchCheck
    state "Safe Merge / Rebase" as MergePull
    state "Push to Remote" as Push
    state "Conflict / Safety Alert" as Alert

    Idle --> Debounce: File Mutation Detected (Add/Change/Unlink)
    Debounce --> Debounce: New Event Within Window (Reset Timer)
    Debounce --> Validate: Quiet Period Expired (or Max Timeout Reached)

    Validate --> Alert: Secret Detected OR File Size Exceeded
    Validate --> Commit: Validation Passed
    
    Commit --> FetchCheck: Commit Created Successfully
    Commit --> Idle: Working Tree Clean / No Meaningful Changes

    FetchCheck --> Push: Local Ahead, Remote In Sync
    FetchCheck --> MergePull: Remote Ahead (Safe FF Possible)
    FetchCheck --> Alert: Remote Diverged (Non-Linear History)

    MergePull --> Push: Merge Clean & Successful
    MergePull --> Alert: Merge Conflict Detected

    Push --> Idle: Push Succeeded
    Push --> FetchCheck: Push Failed (Retry with Exponential Backoff)
    
    Alert --> Idle: User Resolves via Dashboard / Manual Intervention
```

---

## 3. Filesystem Monitoring Architecture

### 3.1 Chokidar Engine Integration
DECK SYNC wraps `chokidar` with specialized Windows filesystem optimizations to handle NTFS file-locking quirks and high-frequency writes:

```typescript
export interface WatcherConfig {
  ignored: (string | RegExp)[];
  persistent: boolean;
  ignoreInitial: boolean;
  followSymlinks: boolean;
  awaitWriteFinish: {
    stabilityThreshold: number; // 2000 ms stability before triggering
    pollInterval: number;        // 100 ms polling rate
  };
  usePolling: boolean;           // False by default; auto-enabled for network drives
}
```

### 3.2 Debounce Matrix & Burst Coalescing
Developers type in bursts, and build tools touch hundreds of files in milliseconds. A naive file watcher would trigger hundreds of redundant commits.

DECK SYNC employs a dual-timer debounce strategy:
1. **Inactivity Timer (`inactivityWindowMs`, default: 5,000ms):**
   Resets every time a new filesystem event occurs in the repository.
2. **Maximum Burst Ceiling (`maxWaitMs`, default: 30,000ms):**
   Guarantees that continuous typing or long build processes do not indefinitely delay commit creation. Once `maxWaitMs` is reached, the batch is forced into validation.

```
Timeline:
Event:  x---x--x-------x-----------------------> (Trigger Batch)
Timer:  |<- 5s ->| (Reset) |<- 5s ->| (Reset) |<- 5s Quiet ->|
```

---

## 4. Pre-Commit Validation & Secret Scanner

Before any file is added to the Git staging index (`git add`), it must pass through the **NIMO-DECK Safety Filter**.

### 4.1 Immutable Ignore Rules
The following paths and patterns are hard-blocked from automatic staging, regardless of the repository's `.gitignore` contents:

```typescript
export const IMMUTABLE_IGNORED_PATTERNS: RegExp[] = [
  // Version control internal directories
  /\/\.git($|\/)/,
  /\/\.hg($|\/)/,
  /\/\.svn($|\/)/,

  // Package dependencies & virtual environments
  /\/node_modules($|\/)/,
  /\/\.pnpm-store($|\/)/,
  /\/\.venv($|\/)/,
  /\/venv($|\/)/,
  /\/vendor($|\/)/,
  /\/__pycache__($|\/)/,

  // Build outputs & caches
  /\/dist($|\/)/,
  /\/build($|\/)/,
  /\/\.next($|\/)/,
  /\/\.nuxt($|\/)/,
  /\/target($|\/)/,           // Rust / Maven
  /\/bin($|\/)/,
  /\/obj($|\/)/,
  /\/\.turbo($|\/)/,
  /\/\.cache($|\/)/,

  // Environment and credential files
  /\.env($|\..*)/,             // .env, .env.local, .env.production
  /\.pem$/,
  /\.key$/,
  /\.pkcs12$/,
  /\.pfx$/,
  /id_rsa($|\..*)/,
  /id_ed25519($|\..*)/,

  // Operating system artifacts
  /Thumbs\.db$/,
  /\.DS_Store$/
];
```

### 4.2 Entropy & High-Confidence Secret Detection
DECK SYNC executes regex pattern matching against staged files to catch accidental credential commits:
- **Private Keys:** `-----BEGIN (RSA|EC|DSA|OPENSSH) PRIVATE KEY-----`
- **GitHub Tokens:** `ghp_[A-Za-z0-9]{36}`, `github_pat_[A-Za-z0-9_]{82}`
- **AWS Access Keys:** `AKIA[0-9A-Z]{16}`
- **OpenAI / OpenRouter API Keys:** `sk-[A-Za-z0-9]{48}`, `sk-or-v1-[a-f0-9]{64}`
- **Google OAuth / Service Accounts:** `"private_key": "-----BEGIN PRIVATE KEY-----"`

> **Safety Invariant:** If a secret match is found, the sync engine aborts the commit, raises a critical notification in the dashboard, and places the affected files in a quarantined list.

---

## 5. Intelligent Commit Construction

### 5.1 Conventional Commits Heuristic Analyzer
When AI assistance is offline or disabled, DECK SYNC infers semantic commit messages using path-based diff analysis:

| File Patterns Modified | Inferred Prefix | Example Commit Title |
| :--- | :--- | :--- |
| `*.test.ts`, `*.spec.js`, `tests/**` | `test:` | `test(sync): update debounce timeout specs` |
| `docs/**`, `*.md` | `docs:` | `docs(readme): add system context diagrams` |
| `package.json`, `pnpm-lock.yaml`, `Cargo.toml` | `chore(deps):` | `chore(deps): update workspace dependencies` |
| `.github/workflows/**`, `Dockerfile` | `ci:` / `build:` | `ci: configure automated test workflow` |
| `src/ui/**`, `src/components/**` | `feat(ui):` | `feat(ui): update repository card layout` |
| Single package scope in monorepo | `refactor(<pkg>):`| `refactor(drive): streamline multipart upload` |

### 5.2 AI-Assisted Commit Summarization
When connected to an active AI provider, DECK SYNC generates concise conventional commit messages based on `git diff --cached --stat` and truncated chunk diffs:
- **Format:** `<type>(<scope>): <concise subject (max 72 chars)>`
- **Body:** Bulleted list of primary structural changes.
- **Footer:** `Signed-off-by: NIMO-DECK Sync Engine <deck-sync@local>`

---

## 6. Remote Synchronization & Conflict Engine

### 6.1 Safe Pull Workflow
1. **Inspect Working Tree:** Execute `git status --porcelain`. If uncommitted changes exist that cannot be safely committed, **halt pull immediately**.
2. **Fetch Remote State:** Execute `git fetch origin <current-branch>`.
3. **Compare Commit SHAs:**
   - If `HEAD == origin/<branch>`: In sync. No action needed.
   - If `HEAD` is strictly ahead of `origin/<branch>`: Ready to push.
   - If `origin/<branch>` is strictly ahead of `HEAD`: Execute `git merge --ff-only origin/<branch>`.
   - If history has diverged (both local and remote have commits):
     - **Do NOT rebase automatically.**
     - Trigger an alert: `DIVERGENCE_DETECTED`.
     - Present the developer with a 3-way visual resolution choice via the Dashboard:
       - Option A: Create merge commit (`git merge`).
       - Option B: Interactive rebase (`git rebase origin/<branch>`).
       - Option C: Branch out (`git checkout -b <branch>-local-divergence`).

### 6.2 Push Policy & Safeguards
- **Auto-Push Mode:** Configurable per project (`OFF`, `ON_COMMIT`, `PERIODIC_INTERVAL`).
- **Strict Prohibition Against Force-Push:**
  The command `git push --force` or `--force-with-lease` is strictly disabled within all automated sync workflows. A force-push requires explicit manual action in the UI with a two-step confirmation modal.
- **Retry Logic:** Network failures or temporary remote locks trigger exponential backoff:
  $$T_{\text{wait}} = \min(60, 2^{\text{attempt}} \times 2) \text{ seconds}$$
  Capped at 5 retry attempts before marking the synchronization status as `FAILED_OFFLINE`.

---

## 7. Repository Health Monitor

The sync engine continuously monitors repository health indicators:

1. **Lockfile Health:** Checks for orphaned `.git/index.lock` files. If a lockfile persists with no active Git child process for > 60 seconds, an alert is surfaced offering one-click safe removal.
2. **Detached HEAD Detection:** Warns users if they are working in a detached HEAD state to prevent unreachably orphaned commits.
3. **Submodule Status:** Verifies that git submodule commits exist on their respective remotes before committing the submodule pointer change.
4. **Git Garbage Collection Advisory:** Flags repositories with excessive loose objects (> 1,000 unpruned objects) recommending `git gc --auto`.

---

## 8. Dry-Run Simulation Mode

DECK SYNC provides a `dryRun: true` parameter across all execution interfaces:
- Computes staged file lists without running `git add`.
- Generates commit titles and bodies without modifying `HEAD`.
- Simulates remote fetch and push compatibility without touching network remotes.
- Emits an execution preview payload to the Dashboard so developers can verify automated behaviors before activating live sync.

---

## 9. Verified Implementation & Module Map

The `@nimo-deck/sync` package implements this specification through the following modular components:

| Component | File Path | Responsibilities |
| :--- | :--- | :--- |
| **GitCLI** | `packages/sync/src/git/git-cli.ts` | Child process execution via `execFile` with argument arrays; runtime assertion preventing `--force`, `-f`, `clean -fd`, or `--hard` in automated routines; timeout and buffer management. |
| **GitStatusInspector** | `packages/sync/src/git/git-status.ts` | Machine-readable porcelain v2 parser extracting dirty tree status, ahead/behind counters, staged/unstaged changes, untracked files, and conflicts. |
| **GitDiffInspector** | `packages/sync/src/git/git-diff.ts` | Parses numstat and diff summaries for staged files; produces truncated diffs for safe AI prompt ingestion. |
| **GitLockMonitor** | `packages/sync/src/git/git-lock.ts` | Detects stale `.git/index.lock` files (> 60s mtime) and safely removes orphaned locks. |
| **DebounceBatcher** | `packages/sync/src/watcher/debounce-batcher.ts` | Coalesces rapid mutation events using an inactivity window (default 5,000ms) capped by a hard burst ceiling (`maxWaitMs`, default 30,000ms). |
| **RepoFileWatcher** | `packages/sync/src/watcher/file-watcher.ts` | Wraps `chokidar.watch` with immutable security ignore filters and dispatches to the batcher. |
| **PreCommitScanner** | `packages/sync/src/safety/pre-commit-scanner.ts` | Pre-staging safety filter inspecting file paths, sizes, credential signatures, and Shannon entropy. Blocks secret leaks before `git add`. |
| **CommitMessageService** | `packages/sync/src/commit/message-generator.ts` | Generates Conventional Commit messages (`feat`, `docs`, `test`, `chore`) based on path heuristics with monorepo scope inference; accepts injectable `AICommitMessageGenerator` with automatic heuristic fallback. |
| **RepoMutex** | `packages/sync/src/sync/repo-mutex.ts` | In-memory mutex providing repository-level concurrency control to guarantee linear, non-colliding Git operations. |
| **RetryQueue** | `packages/sync/src/sync/retry-queue.ts` | Asynchronous retry queue with exponential backoff and randomized jitter for network-related failures. |
| **SyncCoordinator** | `packages/sync/src/sync/sync-coordinator.ts` | Central orchestration engine linking mutex, status inspection, safety scanning, staging, committing, database recording, safe pull (`--ff-only`), and conflict alerting. |
| **SyncDaemonManager** | `packages/sync/src/daemon/daemon-manager.ts` | Multi-repository surveillance manager supporting dynamic repository registration, pause, resume, manual trigger, and graceful shutdown. |

---

## 10. Google Drive Synchronization Boundary & Loop Defense

To ensure absolute safety and prevent circular synchronization storms between Git, local filesystems, and cloud storage:

1. **Non-Remote Principle:** Google Drive is strictly an archive, snapshot, and documentation mirror destination. It is **never** treated as a Git remote repository.
2. **Cryptographic LoopGuard (`@nimo-deck/drive/LoopGuard`):**
   - Every snapshot generated by `SnapshotBuilder` embeds a deterministic `deck-sync-manifest.json` containing:
     - Project metadata (`projectId`, `projectName`, `gitCommitSha`).
     - A cryptographically unique `syncToken` (UUIDv4) and timestamp.
     - SHA-256 digests and file sizes for every included file.
     - Overall `manifestSha256` content fingerprint.
   - When external file modifications or restores are detected, `LoopGuard.isRecentToken(token)` verifies whether the token originated from an internal DECK operation within the sliding TTL window (default 120 seconds).
   - If recognized, the event is acknowledged as self-generated and discarded without initiating redundant Git staging or commit cascades.
3. **Duplicate Upload Prevention:**
   - Before uploading a new snapshot to Google Drive, `DriveBackupService` compares the current `manifestSha256` content digest against the latest successful database record in `drive_backups`.
   - If files have not changed, the upload is skipped with `skippedAsDuplicate: true` (unless explicitly requested via `force: true`), conserving Google Drive storage quota and API calls.
4. **Disaster Recovery Isolation:**
   - Restores performed by `RestoreEngine` mandate explicit user confirmation (`confirmRestore: true`), enforce path-traversal safety, verify recorded SHA-256 digests, and safely handle pre-existing uncommitted local files without data loss.


