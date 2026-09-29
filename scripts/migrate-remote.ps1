# ============================================================================
# Garage Parts Marketplace - Remote Migration & Seeding Helper (PowerShell)
#
#   ./migrate-remote.ps1                                  → migrate + full demo seed
#   ./migrate-remote.ps1 -Fresh                           → WIPE + migrate + full demo seed
#   ./migrate-remote.ps1 -Fresh -Seeder core              → WIPE + migrate + core only (empty marketplace)
#   ./migrate-remote.ps1 -Fresh -Seeder none              → WIPE + migrate, no seeding
#   ./migrate-remote.ps1 -ApiUrl <url> -AppKey <key>      → override target/credential
# ============================================================================

param (
    [string]$ApiUrl = "https://garage-parts-marketplace-official.onrender.com",
    [string]$AppKey = "base64:sM5Th/eioZw9bH6Hj6gsMw4ooLgjauK4bC1/9lpQr6E=",
    [switch]$Fresh,
    [ValidateSet("demo", "core", "none")]
    [string]$Seeder = "demo"
)

Write-Host "=== Garage Parts Marketplace - Remote Database ===" -ForegroundColor Cyan
Write-Host "Target API : $ApiUrl" -ForegroundColor Gray
Write-Host "Mode       : $(if ($Fresh) { 'FRESH WIPE + ' } else { '' })migrate + seed ($Seeder)" -ForegroundColor Gray

$headers = @{
    "Accept" = "application/json"
    "X-App-Key" = $AppKey
}

if ($Fresh) {
    Write-Host "`nWARNING: this WIPES the remote database first." -ForegroundColor Red
    $confirm = Read-Host "Type YES to continue"
    if ($confirm -ne "YES") {
        Write-Host "Aborted — nothing was touched." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "`n1. Checking remote database migration status..." -ForegroundColor Yellow
try {
    $statusRes = Invoke-RestMethod -Uri "$ApiUrl/api/v1/system/migrate-status" -Method Get -Headers $headers -TimeoutSec 30
    Write-Host "Status response:" -ForegroundColor Green
    $statusRes | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Note: Status check returned error or requires initial migration: $_" -ForegroundColor DarkYellow
}

Write-Host "`n2. Executing remote migrations and seeders..." -ForegroundColor Yellow
try {
    $body = @{ fresh = $Fresh.IsPresent; seeder = $Seeder }
    $migrateRes = Invoke-RestMethod -Uri "$ApiUrl/api/v1/system/migrate-seed" -Method Post -Headers $headers -Body ($body | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 600
    Write-Host "Result:" -ForegroundColor Green
    $migrateRes | ConvertTo-Json -Depth 5
    Write-Host "`n[SUCCESS] Remote database ready!" -ForegroundColor Green
} catch {
    Write-Host "`n[ERROR] Migration request failed: $_" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    exit 1
}

Write-Host "`n3. Verifying system health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$ApiUrl/api/v1/health" -Method Get -TimeoutSec 15
    $health | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Health check response error: $_" -ForegroundColor DarkYellow
}
