# NIMO-DECK — DECK DASHBOARD Architecture & UI System

## 1. Overview

`@nimo-deck/dashboard` serves as the universal developer command center for the NIMO-DECK Personal Development Operating System. It provides a production-grade, headless-capable React 19 application interface shared between the Electron desktop shell (`apps/desktop`) and the browser web application (`apps/web`).

The UI provides real-time visibility and management across all 6 core NIMO-DECK subsystems:
- **DECK CORE**: SQLite schema, projects, configurations, and event orchestration.
- **DECK SYNC**: Local Git monitoring, pre-commit secret quarantine, and push/pull coordination.
- **DECK GITHUB**: Remote repositories, pull requests, issues, and branch health.
- **DECK DRIVE**: Google Drive snapshots, release archives, and documentation mirrors.
- **DECK INTELLIGENCE**: AST analysis, verified facts vs. AI hypotheses, cognitive roadmaps, and cross-project memory.
- **DECK VAULT**: Differential content-addressed snapshots, cryptographic SHA-256 audit chaining, and zero-data-loss rollback.

---

## 2. Design System & Aesthetics

The design system implements a premium dark developer aesthetic engineered for low eye strain during long programming sessions:

| Token | Value | Purpose |
| :--- | :--- | :--- |
| `--deck-bg-navy` | `#0A0F1D` | Primary window and layout background |
| `--deck-bg-card` | `#111827` | Content containers, panels, and modal backdrops |
| `--deck-bg-card-hover` | `#1E293B` | Interactive hover highlight state |
| `--deck-border` | `#1E293B` | Subtle, high-contrast structural divider |
| `--deck-accent-blue` | `#3B82F6` | Primary action buttons, active tab indicators |
| `--deck-accent-cyan` | `#06B6D4` | AI Intelligence indicators and cognitive badges |
| `--deck-accent-emerald` | `#10B981` | Clean Git sync, validated audit chain status |
| `--deck-accent-amber` | `#F59E0B` | Uncommitted changes, pending reviews, warnings |
| `--deck-accent-rose` | `#EF4444` | Diverged branches, quarantined secrets, errors |
| `--deck-text-primary` | `#F1F5F9` | Primary headings, code symbols, active labels |
| `--deck-text-secondary` | `#94A3B8` | Subheadings, descriptions, metadata |
| `--deck-text-muted` | `#64748B` | Timestamps, disabled controls, hints |

The system fully supports responsive layout adjustments, sidebar collapsing, and dynamic light/dark mode toggling (`data-theme="dark"` / `data-theme="light"`).

---

## 3. Transport Abstraction Layer

To ensure complete decoupling from Electron-specific or browser-specific runtimes, all network and IPC communication implements the `IDashboardTransport` interface:

```typescript
export interface IDashboardTransport {
  invoke<TRequest = unknown, TResponse = unknown>(
    channel: string,
    payload?: TRequest
  ): Promise<TResponse>;

  subscribe<TEvent = unknown>(
    event: string,
    handler: (data: TEvent) => void
  ): () => void;

  isAvailable(): boolean;
  getTransportType(): 'ipc' | 'http' | 'mock';
}
```

### Transport Implementations

1. **`IpcDashboardTransport` (`apps/desktop`)**:
   - Dispatches via `window.deckAPI.invoke(channel, payload)` over Electron context isolation.
   - Enforces zero node builtins exposure in the renderer process.
2. **`HttpDashboardTransport` (`apps/web`)**:
   - Dispatches via authenticated JSON-RPC over `POST /api/deck/rpc`.
   - Supports bearer token injection (`Authorization: Bearer <token>`) and offline fallback.
3. **`MockDashboardTransport` (Local development & Storybook/Testing)**:
   - Contains high-fidelity realistic fixtures reflecting actual multi-repository, multi-commit, and vault snapshot state.
   - Supports in-memory event subscriptions and state mutations.

---

## 4. Navigation Views & Workspace Tabs

### 11 Primary Command Center Views

1. **Overview View**: High-level system vitals, synchronized repository count, recent commit activity, Google Drive backup capacity, audit chain verification status, and recent notifications.
2. **Projects View**: Central inventory of all monitored projects with health badges, branch tracking, sync status, and quick-action shortcuts.
3. **Repository Explorer**: Deep filesystem directory tree inspection, staged/unstaged Git diff viewer, branch checkout switcher, and file status badges.
4. **Activity Timeline**: Chronological, unified feed correlating Git commits, vault snapshots, Drive backups, and AI analysis events.
5. **GitHub Sync**: Remote repository synchronization dashboard, branch mapping, open pull requests, assigned issues, and webhook delivery status.
6. **Google Drive**: Cloud snapshot mirror repository, storage quota gauges, manual backup triggers, and restore points.
7. **AI Intelligence**: Grounded repository understanding, verified facts vs. AI hypotheses, cognitive architectural summaries, and cross-project knowledge graph.
8. **Development Roadmaps**: Interactive multi-phase milestones, task dependency graphs, and complexity matrices.
9. **Project History**: Commit timeline, author statistics, branch divergence trees, and tag releases.
10. **Vault & Recovery**: Content-addressed differential snapshots, tamper-evident SHA-256 cryptographic audit chain verifier, pre-restore diff preview, and automated changelog generator.
11. **Settings & Security**: GitHub OAuth token management, Google Drive scopes, AI provider keys (OpenRouter, Gemini, OpenAI, Claude, Ollama), auto-sync debounce tuning, and security logging level.

### Dedicated Project Workspace (9 Tabs)

When a project is selected, the command center shifts context into an intensive repository IDE workspace:
- **Overview**: Repository quick metrics and pending sync operations.
- **Repository**: Directory tree and code preview.
- **Activity**: Project-scoped event timeline.
- **Intelligence**: Grounded architectural analysis and actionable recommendations.
- **Roadmap**: Milestone progress tracker.
- **Documentation**: Mirrored README, architecture specifications, and API guides.
- **History**: Full Git log and author contribution charts.
- **Snapshots**: Content-addressed recovery checkpoints with restore preview and rollback.
- **Settings**: Per-project sync intervals, secret quarantine exclusions, and backup policies.

---

## 5. Universal Productivity Features

- **Command Palette (`Ctrl+K` / `Cmd+K`)**: Instant fuzzy search across projects, navigation views, and immediate actions (e.g., "Trigger Git Commit", "Verify Audit Chain", "Create Drive Backup").
- **Notification Center**: Slide-out tray displaying real-time alerts for commits, push notifications, secret quarantine alerts, and backup completions with one-click read status tracking.
- **First-Launch Onboarding Wizard**: Guided 7-step onboarding flow covering project filesystem discovery, Git authentication, Drive linking, AI engine selection, and policy configuration.
- **Feedback States**: Standardized `<EmptyState />`, `<LoadingSkeleton />`, and `<ErrorBanner />` components ensuring no layout shifts or unhandled network drops.

---

## 6. Testing & Quality Verification

`@nimo-deck/dashboard` is covered by rigorous Vitest unit and integration suites verifying:
- Service facade method routing across all IPC channels.
- Transport failover and event subscription lifecycles.
- Real-time notification reading and settings mutation.
