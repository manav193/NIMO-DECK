# NIMO-DECK — Multi-Device Architecture & Federation

## 1. Multi-Device Topology

NIMO-DECK coordinates development workflows across multiple workstations (e.g. Primary Desktop, Traveling Laptop, Cloud VM) using a hub-and-spoke federation model:

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│     PRIMARY WORKSTATION (PC)    │           │    TRAVELING WORKSTATION (Mac)  │
│  - Local SQLite (Offline-First) │           │  - Local SQLite (Offline-First) │
│  - Local Git Repo Filesystem    │           │  - Local Git Repo Filesystem    │
│  - Device Keypair (Ed25519)     │           │  - Device Keypair (Ed25519)     │
└────────────────┬────────────────┘           └────────────────┬────────────────┘
                 │ Signed Metadata Payload                     │ Signed Metadata Payload
                 ▼                                             ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                    NIMO-DECK CLOUD FEDERATION CONTROL PLANE                   │
│  - Apps/cloud-backend (Hosted on Cloud Run, Railway, or VPS)                  │
│  - Authenticated Device Registry & Sliding-Window Rate Limiting               │
│  - Central Metadata Catalog (PostgreSQL / In-Memory Cluster)                  │
│  - Audit Sequence & Branch Divergence Conflict Detector                       │
└───────────────────────┬───────────────────────────────┬───────────────────────┘
                        │ Canonical Code Sync           │ Disaster Recovery
                        ▼                               ▼
            ┌───────────────────────┐       ┌───────────────────────┐
            │   GITHUB REPOSITORIES │       │   GOOGLE DRIVE VAULT  │
            │   (Source Code Truth) │       │   (Backup Archives)   │
            └───────────────────────┘       └───────────────────────┘
```

---

## 2. Inviolable Security Boundaries

To guarantee security across public and private networks:
1. **Zero Remote Filesystem Access:** Remote devices and cloud servers NEVER receive filesystem read/write APIs. Local paths (e.g., `C:\Users\manav\OneDrive\NIMO-DECK`) exist exclusively on the local machine and are stripped from all outbound federation payloads (`CrossDeviceSyncPayload`).
2. **Zero Direct Internet Exposure:** Workstations do NOT listen on public ports or expose local management sockets to the internet. All communication is outbound HTTPS to the Cloud Control Plane, GitHub, and Google Drive.
3. **Canonical Authority:**
   - **GitHub** is the sole canonical source of version-controlled source code history.
   - **Google Drive** is used exclusively for encrypted release snapshots and disaster recovery archives.

---

## 3. Device Registration & Identity

Each participating computer generates a unique cryptographic device profile:
- **`id`**: Universally unique UUID.
- **`fingerprint`**: SHA-256 digest of hardware profile and initial installation timestamp.
- **`publicKey`**: Ed25519 or ECDSA public key used for signing outbound synchronizations.
- **`status`**: `ACTIVE`, `OFFLINE`, `REVOKED`, or `PENDING_PAIRING`.

### Pairing Flow
1. The user generates a short-lived pairing code (e.g., `DECK-7492-XQ`) from the Primary Workstation.
2. The secondary workstation sends a `POST /api/v1/devices/pair` request containing the pairing code, device name, fingerprint, and public key.
3. The Cloud Control Plane validates the code, registers the device in the cluster, and issues short-lived JWT access tokens and rotating refresh tokens.

---

## 4. Conflict Detection & Cross-Device Sync

When a workstation syncs metadata with the cloud:
1. **Audit Sequence Validation:** Each device reports its latest local cryptographic audit sequence number (`latestAuditSequence`).
2. **Divergence Warning:** If Device B reports a higher audit sequence than Device A for the same project, Device A receives a `PULL_REQUIRED` alert before allowing automatic pushes.
3. **Git Divergence Detection:** The remote sync state checks whether the local HEAD SHA matches the remote branch HEAD, preventing silent overwrite of remote commits.
