<#
.SYNOPSIS
  Signs NIMO-DECK Windows PE binaries (.exe, .dll, .node) using Authenticode and RFC 3161 timestamping.

.DESCRIPTION
  This script implements the Windows Smart App Control (SAC) code-signing pipeline for NIMO-DECK.
  It supports CA-issued RSA certificates from:
    1. Environment variables:
       - CSC_LINK / SIGNING_CERT_PATH (path or base64)
       - CSC_KEY_PASSWORD / SIGNING_CERT_PASSWORD
    2. Windows Certificate Store:
       - CSC_THUMBPRINT / SIGNING_CERT_THUMBPRINT (thumbprint in Cert:\CurrentUser\My or Cert:\LocalMachine\My)
       - CSC_NAME / SIGNING_CERT_NAME (Subject CN or friendly name)

  Smart App Control (SAC) Compliance Requirements:
    - Trusted CA root chain (Self-signed certificates are rejected by SAC)
    - RSA key length >= 2048-bit
    - SHA-256 digest algorithm
    - Trusted RFC 3161 timestamp (DigiCert / Sectigo)
#>

[CmdletBinding()]
param(
  [string]$CertificatePath = $(if ($env:CSC_LINK) { $env:CSC_LINK } else { $env:SIGNING_CERT_PATH }),
  [string]$CertificatePassword = $(if ($env:CSC_KEY_PASSWORD) { $env:CSC_KEY_PASSWORD } else { $env:SIGNING_CERT_PASSWORD }),
  [string]$CertificateThumbprint = $(if ($env:CSC_THUMBPRINT) { $env:CSC_THUMBPRINT } else { $env:SIGNING_CERT_THUMBPRINT }),
  [string]$CertificateSubject = $(if ($env:CSC_NAME) { $env:CSC_NAME } else { $env:SIGNING_CERT_NAME }),
  [string]$TimestampServer = $(if ($env:TIMESTAMP_SERVER_URL) { $env:TIMESTAMP_SERVER_URL } else { "http://timestamp.digicert.com" }),
  [string]$TargetDirectory = "apps/desktop/release",
  [switch]$Strict = ($env:REQUIRE_SIGNING -eq "true" -or $env:REQUIRE_SIGNING -eq "1")
)

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " NIMO-DECK Authenticode Code-Signing Pipeline" -ForegroundColor Cyan
Write-Host " Smart App Control (SAC) & WDAC Policy Compliance" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Resolve Code-Signing Certificate
$Cert = $null

if (-not [string]::IsNullOrWhiteSpace($CertificatePath)) {
  Write-Host "[Cert-Resolver] Resolving certificate from path or base64..." -ForegroundColor Green
  if (Test-Path $CertificatePath) {
    if (-not [string]::IsNullOrWhiteSpace($CertificatePassword)) {
      $secPass = ConvertTo-SecureString $CertificatePassword -AsPlainText -Force
      $Cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($CertificatePath, $secPass, "Exportable,PersistKeySet")
    } else {
      $Cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($CertificatePath)
    }
  } else {
    # Check if base64 encoded
    try {
      $certBytes = [System.Convert]::FromBase64String($CertificatePath)
      $tempCertPath = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "nimodeck-signing-[System.Guid]::NewGuid().pfx")
      [System.IO.File]::WriteAllBytes($tempCertPath, $certBytes)
      $secPass = ConvertTo-SecureString $CertificatePassword -AsPlainText -Force
      $Cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($tempCertPath, $secPass, "Exportable,PersistKeySet")
      Remove-Item $tempCertPath -Force -ErrorAction SilentlyContinue
    } catch {
      Write-Host "[Cert-Resolver] Failed to parse CertificatePath as file or base64: $_" -ForegroundColor Red
    }
  }
} elseif (-not [string]::IsNullOrWhiteSpace($CertificateThumbprint)) {
  Write-Host "[Cert-Resolver] Searching Windows Certificate Store for thumbprint '$CertificateThumbprint'..." -ForegroundColor Green
  $thumb = $CertificateThumbprint.Replace(" ", "").ToUpper()
  $Cert = Get-Item "Cert:\CurrentUser\My\$thumb" -ErrorAction SilentlyContinue
  if (-not $Cert) {
    $Cert = Get-Item "Cert:\LocalMachine\My\$thumb" -ErrorAction SilentlyContinue
  }
} elseif (-not [string]::IsNullOrWhiteSpace($CertificateSubject)) {
  Write-Host "[Cert-Resolver] Searching Windows Certificate Store for subject '$CertificateSubject'..." -ForegroundColor Green
  $Cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Where-Object { $_.Subject -like "*$CertificateSubject*" -or $_.FriendlyName -like "*$CertificateSubject*" } | Select-Object -First 1
  if (-not $Cert) {
    $Cert = Get-ChildItem Cert:\LocalMachine\My -CodeSigningCert | Where-Object { $_.Subject -like "*$CertificateSubject*" -or $_.FriendlyName -like "*$CertificateSubject*" } | Select-Object -First 1
  }
}

if (-not $Cert) {
  Write-Host "`n[WARNING] No trusted code-signing certificate was detected." -ForegroundColor Yellow
  Write-Host "Windows Smart App Control requires all executables to be signed by a trusted CA." -ForegroundColor Yellow
  Write-Host "To configure signing, provide one of the following:" -ForegroundColor Yellow
  Write-Host "  - PFX file: set CSC_LINK=<path-to-pfx> and CSC_KEY_PASSWORD=<password>"
  Write-Host "  - Store cert: set CSC_THUMBPRINT=<thumbprint> or CSC_NAME=<subject>"
  Write-Host "  - Timestamp server: TIMESTAMP_SERVER_URL (default: http://timestamp.digicert.com)"
  Write-Host "For setup instructions, see docs/PRODUCTION.md and docs/INSTALLATION.md.`n"

  if ($Strict) {
    Write-Error "Strict code signing mode is enabled (REQUIRE_SIGNING=true), but no valid certificate is available. Aborting release."
    exit 1
  }
  exit 0
}

# 2. Validate Certificate Specifications
Write-Host "[Cert-Validation] Validating certificate properties..." -ForegroundColor Green
Write-Host "  Subject:      $($Cert.Subject)"
Write-Host "  Issuer:       $($Cert.Issuer)"
Write-Host "  Thumbprint:   $($Cert.Thumbprint)"
Write-Host "  NotBefore:    $($Cert.NotBefore)"
Write-Host "  NotAfter:     $($Cert.NotAfter)"
Write-Host "  HasPrivateKey: $($Cert.HasPrivateKey)"

if (-not $Cert.HasPrivateKey) {
  Write-Error "The specified certificate does not contain an accessible private key. Signing cannot proceed."
  exit 1
}

# Smart App Control Warning for Self-Signed Certs
if ($Cert.Subject -eq $Cert.Issuer) {
  Write-Host "`n[CRITICAL NOTICE: SMART APP CONTROL]" -ForegroundColor Magenta
  Write-Host "This certificate is SELF-SIGNED (Subject equals Issuer)." -ForegroundColor Magenta
  Write-Host "Windows Smart App Control (SAC) blocks self-signed binaries by design." -ForegroundColor Magenta
  Write-Host "SAC requires reputation from Microsoft's Intelligent Security Graph (ISG) or a commercial trusted CA." -ForegroundColor Magenta
  if ($Strict) {
    Write-Error "Self-signed certificate cannot satisfy Smart App Control requirements in strict mode."
    exit 1
  }
}

# 3. Locate All Distributed PE Binaries
$SearchRoot = Resolve-Path $TargetDirectory -ErrorAction SilentlyContinue
if (-not $SearchRoot) {
  Write-Error "Target directory '$TargetDirectory' not found."
  exit 1
}

Write-Host "`n[Binary-Discovery] Discovering PE executables in $SearchRoot..." -ForegroundColor Green
$Binaries = Get-ChildItem -Path $SearchRoot -Recurse -Include *.exe, *.dll, *.node | Where-Object {
  $_.FullName -notmatch "\\node_modules\\(?!better-sqlite3)" -and
  $_.Name -notmatch "^(darwin|linux)"
}

Write-Host "Discovered $($Binaries.Count) binary files to sign:`n"
foreach ($b in $Binaries) {
  Write-Host "  - $($b.FullName.Replace($SearchRoot, ''))"
}

# 4. Sign Each Binary with SHA-256 and RFC 3161 Timestamping
Write-Host "`n[Authenticode-Signer] Signing binaries using SHA-256 with timestamp server: $TimestampServer..." -ForegroundColor Green

$SuccessCount = 0
$FailCount = 0

foreach ($b in $Binaries) {
  Write-Host "Signing: $($b.Name)..." -NoNewline
  try {
    $sig = Set-AuthenticodeSignature -FilePath $b.FullName -Certificate $Cert -HashAlgorithm "SHA256" -TimestampServer $TimestampServer
    if ($sig.Status -eq "Valid") {
      Write-Host " [SUCCESS (Valid)]" -ForegroundColor Green
      $SuccessCount++
    } else {
      Write-Host " [WARNING: $($sig.Status)] - $($sig.StatusMessage)" -ForegroundColor Yellow
      $FailCount++
    }
  } catch {
    Write-Host " [FAILED: $_]" -ForegroundColor Red
    $FailCount++
  }
}

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host " Signing Complete: $SuccessCount succeeded, $FailCount warnings/errors" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

if ($FailCount -gt 0 -and $Strict) {
  Write-Error "Strict mode failure: $FailCount binaries failed signature verification."
  exit 1
}
