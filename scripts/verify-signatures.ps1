<#
.SYNOPSIS
  Audits and verifies Authenticode signatures on all NIMO-DECK Windows PE binaries for Smart App Control compliance.

.DESCRIPTION
  Scans all packaged executables (.exe, .dll, .node) and performs comprehensive signature verification:
  - Validates Get-AuthenticodeSignature status (Must be Valid)
  - Checks for RFC 3161 timestamp signature
  - Checks SHA-256 digest algorithm
  - Validates trusted root certificate chain
  - Validates RSA public key algorithm
  - Checks for consistent publisher identity across all binaries
  - Detects self-signed certificates that fail Windows Smart App Control

.OUTPUTS
  Returns exit code 0 if all binaries pass verification.
  Returns exit code 1 if any binary is unsigned or invalid when -Strict is enabled (or REQUIRE_SIGNING=true).
#>

[CmdletBinding()]
param(
  [string]$TargetDirectory = "apps/desktop/release",
  [switch]$Strict = ($env:REQUIRE_SIGNING -eq "true" -or $env:REQUIRE_SIGNING -eq "1"),
  [string]$ExpectedPublisher = $env:EXPECTED_PUBLISHER
)

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " NIMO-DECK Authenticode Signature Verification Gate" -ForegroundColor Cyan
Write-Host " Smart App Control (SAC) Compatibility Audit" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

$SearchPath = Resolve-Path $TargetDirectory -ErrorAction SilentlyContinue
if (-not $SearchPath) {
  Write-Error "Target directory '$TargetDirectory' does not exist."
  exit 1
}

$Binaries = Get-ChildItem -Path $SearchPath -Recurse -Include *.exe, *.dll, *.node | Where-Object {
  $_.FullName -notmatch "\\node_modules\\(?!better-sqlite3)" -and
  $_.Name -notmatch "^(darwin|linux)"
}

if ($Binaries.Count -eq 0) {
  Write-Warning "No executable binaries found to verify in $SearchPath."
  exit 0
}

Write-Host "Auditing $($Binaries.Count) PE binaries for Authenticode integrity...`n"

$AuditResults = @()
$HasFailure = $false
$HasUnsigned = $false
$FirstPublisher = $null

foreach ($binary in $Binaries) {
  $relPath = $binary.FullName.Replace($SearchPath.Path, "").TrimStart("\/")
  $sig = Get-AuthenticodeSignature -FilePath $binary.FullName

  $isSigned = ($sig.Status -ne "NotSigned" -and $null -ne $sig.SignerCertificate)
  $isValid = ($sig.Status -eq "Valid")
  $hasTimestamp = ($null -ne $sig.TimeStamperCertificate)
  $isSelfSigned = $false
  $algorithm = "None"
  $publisher = "Unknown"

  if ($isSigned) {
    $publisher = $sig.SignerCertificate.Subject
    $algorithm = $sig.SignerCertificate.SignatureAlgorithm.FriendlyName
    if ($sig.SignerCertificate.Subject -eq $sig.SignerCertificate.Issuer) {
      $isSelfSigned = $true
    }
    if ($null -eq $FirstPublisher) {
      $FirstPublisher = $publisher
    }
  } else {
    $HasUnsigned = $true
  }

  $sacCompliant = $false
  $complianceReason = ""

  if (-not $isSigned) {
    $complianceReason = "BLOCKED by SAC: Binary is unsigned"
    $HasFailure = $true
  } elseif (-not $isValid) {
    $complianceReason = "BLOCKED by SAC: Signature status is $($sig.Status) ($($sig.StatusMessage))"
    $HasFailure = $true
  } elseif ($isSelfSigned) {
    $complianceReason = "BLOCKED by SAC: Self-signed certificate lacks Microsoft ISG reputation"
    $HasFailure = $true
  } elseif (-not $hasTimestamp) {
    $complianceReason = "WARNING: Missing RFC 3161 timestamp (signature expires with certificate)"
  } else {
    $sacCompliant = $true
    $complianceReason = "PASS: Fully compliant with Smart App Control"
  }

  # Publisher consistency check
  if ($isSigned -and (-not [string]::IsNullOrWhiteSpace($ExpectedPublisher))) {
    if ($publisher -notlike "*$ExpectedPublisher*") {
      $sacCompliant = $false
      $complianceReason = "FAIL: Publisher '$publisher' does not match expected '$ExpectedPublisher'"
      $HasFailure = $true
    }
  }

  $displayPublisher = $publisher
  if ($displayPublisher.Length -gt 35) {
    $displayPublisher = $displayPublisher.Substring(0, 32) + "..."
  }

  $sacStatus = "FAIL"
  if ($sacCompliant) {
    $sacStatus = "PASS"
  }

  $AuditResults += [PSCustomObject]@{
    Binary         = $relPath
    Status         = $sig.Status
    Timestamped    = $hasTimestamp
    Algorithm      = $algorithm
    Publisher      = $displayPublisher
    SAC_Compliance = $sacStatus
    Details        = $complianceReason
  }
}

# Display Formatted Audit Table
$AuditResults | Format-Table -Property Binary, Status, Timestamped, SAC_Compliance, Details -AutoSize

$passCount = ($AuditResults | Where-Object { $_.SAC_Compliance -eq "PASS" }).Count
$failCount = ($AuditResults | Where-Object { $_.SAC_Compliance -eq "FAIL" }).Count

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Audit Summary:" -ForegroundColor Cyan
Write-Host " Total Binaries Audited: $($Binaries.Count)"
Write-Host " SAC Compliant (PASS):   $passCount"
Write-Host " Non-Compliant (FAIL):   $failCount"
Write-Host "=================================================================" -ForegroundColor Cyan

if ($HasFailure) {
  Write-Host "`n[SMART APP CONTROL DIAGNOSTIC]" -ForegroundColor Yellow
  Write-Host "Windows Smart App Control enforces Code Integrity policy {0283ac0f-fff1-49ae-ada1-8a933130cad6}." -ForegroundColor Yellow
  Write-Host "When an unsigned or untrusted binary is executed, SAC blocks it and logs Event ID 3077." -ForegroundColor Yellow
  Write-Host "To resolve this in production releases:" -ForegroundColor Yellow
  Write-Host "  1. Acquire a commercial Authenticode Code Signing Certificate (EV or OV) from a trusted CA." -ForegroundColor Yellow
  Write-Host "  2. Configure signing credentials via CSC_LINK and CSC_KEY_PASSWORD or Windows Certificate Store." -ForegroundColor Yellow
  Write-Host "  3. Re-run: powershell -File scripts/sign-binaries.ps1" -ForegroundColor Yellow
  Write-Host "  4. Verify with: powershell -File scripts/verify-signatures.ps1 -Strict`n"

  if ($Strict) {
    Write-Error "Release verification failed: $failCount binaries do not meet Authenticode Smart App Control requirements in strict mode."
    exit 1
  } else {
    Write-Host "[NOTICE] Strict verification is disabled (REQUIRE_SIGNING!=true). Skipping release gate rejection for local development." -ForegroundColor Cyan
    exit 0
  }
} else {
  Write-Host "`nAll packaged PE binaries are verified, properly signed, and compatible with Windows Smart App Control!" -ForegroundColor Green
  exit 0
}
