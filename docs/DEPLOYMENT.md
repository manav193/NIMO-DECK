# NIMO-DECK — Production Deployment Guide

## 1. Overview

This document specifies deployment workflows for all three deployable targets of NIMO-DECK:
1. **Windows Desktop Application (`apps/desktop`)**
2. **Web Dashboard (`apps/web`)**
3. **Cloud Federation Control Plane (`apps/cloud-backend`)**

---

## 2. Windows Desktop Deployment

### Build Prerequisites
- Node.js >= 20.x, npm >= 10.x
- Windows 10/11 x64 or ARM64

### Build Windows Installer
```bash
# 1. Compile monorepo workspaces
npm run build

# 2. Package desktop executable
cd apps/desktop
npm run build
```

The resulting binaries will be created in `apps/desktop/release/`:
- `NIMO-DECK-Setup-0.1.0.exe` (NSIS Installer)
- `NIMO-DECK-0.1.0.exe` (Portable Single Executable)

---

## 3. Cloud Federation Control Plane Deployment (`apps/cloud-backend`)

The cloud control plane orchestrates multi-device authentication, rate limiting, and project metadata sync.

### Environment Variables
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `CLOUD_PORT` | HTTP port for incoming connections | `4000` |
| `DECK_MASTER_PASSWORD` | Administrative password for pairing & dashboard access | Secure passphrase |
| `DECK_JWT_SECRET` | 32-byte hexadecimal string for signing JWT tokens | Random hex |
| `DATABASE_URL` | PostgreSQL connection string for cloud federation persistence | `postgres://user:pass@host:5432/deck` |

### Docker Deployment
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app /app
EXPOSE 4000
CMD ["node", "apps/cloud-backend/dist/server.js"]
```

---

## 4. Web Dashboard Deployment (`apps/web`)

### Environment Variables
| Variable | Description |
| :--- | :--- |
| `PORT` | Web server listening port (default: `3000`) |
| `DECK_AUTH_TOKEN` | Bearer token for authenticating `/api/deck/rpc` requests |
| `DATABASE_PATH` | Path to local or shared SQLite database |

### Launch Web Server
```bash
PORT=3000 DECK_AUTH_TOKEN=secret-bearer-token npm start --workspace=@nimo-deck/web
```
Access the dashboard at `http://localhost:3000` or append `?mock=true` for demonstration mode.
