# NIMO-DECK — Web Application & Authenticated API Server

## 1. Overview

`apps/web` provides a browser-accessible deployment of the NIMO-DECK developer command center. It reuses the exact same `@nimo-deck/dashboard` React 19 user interface and design system as the desktop app, communicating with the backend over an authenticated HTTP JSON-RPC transport (`HttpDashboardTransport`).

---

## 2. Web Application Architecture

```
┌────────────────────────────────────────────────────────┐
│               CLIENT BROWSER (REACT 19)                │
│  - @nimo-deck/dashboard UI                             │
│  - HttpDashboardTransport (fetch API)                  │
│  - Automatic token management & ?mock=true fallback    │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP POST /api/deck/rpc
                           │ Authorization: Bearer <token>
                           ▼
┌────────────────────────────────────────────────────────┐
│               NODE.JS WEB SERVER                       │
│  - DeckWebServer (src/server.ts)                       │
│  - CORS & Bearer Token Authentication                  │
│  - Health Monitoring (/health)                         │
│  - Channel Dispatcher to Core & Vault Subsystems       │
└────────────────────────────────────────────────────────┘
```

---

## 3. RPC Protocol Specification

All remote procedure calls from the web client to the backend follow a clean JSON-RPC envelope over `POST /api/deck/rpc`:

### Request
```http
POST /api/deck/rpc HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Authorization: Bearer <DECK_AUTH_TOKEN>

{
  "channel": "system:getOverview",
  "payload": {}
}
```

### Response
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "totalProjects": 3,
  "activeProjects": 3,
  "syncedRepos": 3,
  "pendingSyncCount": 0,
  "totalSnapshots": 12,
  "verifiedAuditRecords": 48,
  "aiRecommendationsCount": 6
}
```

---

## 4. Security & Authentication

1. **Bearer Token Validation**: If `DECK_AUTH_TOKEN` is configured in the environment, all requests to `/api/deck/rpc` must include a valid `Authorization: Bearer <token>` header. Missing or mismatched tokens receive an immediate HTTP 401 Unauthorized response.
2. **CORS Control**: Headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`) are strictly managed, allowing fine-grained access in cross-origin multi-device architectures.
3. **Health Probe**: An unauthenticated `GET /health` endpoint provides readiness and liveness checks for containerized and cloud deployments:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-11-09T18:30:00.000Z"
   }
   ```

---

## 5. Development & Running

### Build Web Application
```bash
npm run build --workspace=@nimo-deck/web
```

### Start Backend API Server
```bash
PORT=3000 DECK_AUTH_TOKEN=my-secret-token npm start --workspace=@nimo-deck/web
```

### Standalone / Demo Mode
The web interface can also be previewed offline or in demo environments without a running server by appending `?mock=true` to the URL.
