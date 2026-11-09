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

---

## 5. Windows Smart App Control (SAC) & Code Signing

Windows 11 includes **Smart App Control (SAC)**, an advanced Code Integrity subsystem governed by the `VerifiedAndReputableDesktop` policy (GUID: `{0283ac0f-fff1-49ae-ada1-8a933130cad6}`).

### 5.1 Why Smart App Control Blocks Unsigned Executables (Event ID 3077)
When an executable (.exe) or native library (.dll, .node) lacks an Authenticode digital signature issued by a trusted Commercial Certificate Authority (CA), Code Integrity triggers Event ID 3077:
```
Policy: VerifiedAndReputableDesktop {0283ac0f-fff1-49ae-ada1-8a933130cad6}
Event ID: 3077
TotalSignatureCount: 0
Status: Blocked (Untrusted/Unknown Publisher)
```

> [!IMPORTANT]
> **Self-Signed Certificates Do Not Work with Smart App Control.**
> Self-signed certificates lack reputation in Microsoft's cloud-powered Intelligent Security Graph (ISG). Smart App Control explicitly requires an RSA code-signing certificate issued by a recognized public CA (DigiCert, Sectigo, GlobalSign, SSL.com, Entrust).

### 5.2 Configuring a Trusted CA Certificate for Production Builds
To sign NIMO-DECK binaries for Smart App Control compliance, configure your certificate using secure environment variables or the Windows Certificate Store:

#### Method A: PFX Certificate File
Set the following environment variables in your secure CI/CD or build environment:
```powershell
$env:CSC_LINK = "C:\path\to\your-cert.pfx"         # Or base64-encoded string
$env:CSC_KEY_PASSWORD = "your-private-key-password"
$env:TIMESTAMP_SERVER_URL = "http://timestamp.digicert.com"
```

#### Method B: Windows Certificate Store (Hardware Token / HSM / Smart Card)
Install your commercial certificate into your personal store (`Cert:\CurrentUser\My`):
```powershell
$env:CSC_THUMBPRINT = "YOUR_CERTIFICATE_SHA1_THUMBPRINT"
# Or search by subject:
$env:CSC_NAME = "Your Company or Publisher Name"
```

### 5.3 Signing & Pre-Release Verification Pipeline
Once configured, execute the automated signing and audit scripts:
```powershell
# 1. Package desktop application
npm run package:win

# 2. Sign all packaged binaries (executables, DLLs, native .node modules)
npm run sign:binaries

# 3. Audit all PE binaries against Smart App Control rules
npm run verify:signatures

# 4. Strict CI gate (fails with exit code 1 if any binary is unsigned or invalid)
powershell -File scripts/verify-signatures.ps1 -Strict
```

### 5.4 Running in Local Development (Without a Commercial Certificate)
While developing locally before acquiring a commercial certificate:
- Run NIMO-DECK from source using `npm start --workspace=@nimo-deck/desktop`.
- Development execution runs through Node.js and Electron's pre-approved developer environment and does not trigger SAC uninstaller blocking.
