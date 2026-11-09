# NIMO-DECK — Installation & Setup Guide

## 1. System Requirements

- **Operating System:** Windows 10, Windows 11 (64-bit), macOS 13+, or Ubuntu 22.04+
- **Memory:** Minimum 4GB RAM (8GB recommended for AST analysis of 50+ repositories)
- **Disk Space:** 500MB free space for installation; additional space for Content-Addressed Vault snapshots
- **Prerequisites:** Git CLI installed and available on system `PATH`

---

## 2. Installation on Windows

### Option A: Graphical Installer (Recommended)
1. Download `NIMO-DECK-Setup-0.1.0.exe` from the latest GitHub Release.
2. Double-click the installer and follow the setup wizard:
   - Choose destination folder (default: `%LOCALAPPDATA%\Programs\NIMO-DECK`).
   - Select whether to create a Desktop icon and Start Menu shortcut.
3. Click **Install**. The background sync daemon will be automatically registered.

### Option B: From Source (Developer Mode)
```bash
# Clone repository
git clone https://github.com/manav193/NIMO-DECK.git
cd NIMO-DECK

# Install dependencies and build monorepo packages
npm install
npm run build

# Start Electron desktop application
npm start --workspace=@nimo-deck/desktop
```

---

## 3. Data Directory Layout

NIMO-DECK stores all user state, databases, and backup archives in `%USERPROFILE%\.nimo-deck\`:

```
%USERPROFILE%\.nimo-deck\
├── nimo-deck.sqlite          # Primary SQLite database (WAL journal mode)
├── nimo-deck.sqlite-wal      # Write-Ahead Log
├── logs/                     # Rotating structured application logs
│   ├── nimo-deck.log         # Active log file
│   └── nimo-deck.log.1       # Rotated backup generations
└── vault/                    # Content-Addressed Storage (CAS)
    ├── blobs/                # SHA-256 chunked compressed file content
    └── manifests/            # Snapshot recovery manifests
```

---

## 4. Upgrading & Uninstallation

### Upgrades
Running a newer installer automatically updates application binaries while strictly preserving the `%USERPROFILE%\.nimo-deck\` directory.

### Uninstallation
When uninstalling via Windows **Settings > Apps > Installed apps**:
- Application binaries and desktop shortcuts are removed cleanly.
- User project databases, Git commit history, and Vault snapshots in `%USERPROFILE%\.nimo-deck\` are **preserved** by default to prevent accidental data loss. To permanently erase user data, manually delete `%USERPROFILE%\.nimo-deck\`.
