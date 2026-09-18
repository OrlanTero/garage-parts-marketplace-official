# ============================================================================
# Garage Parts Marketplace - Remote Migration & Seeding Helper (PowerShell)
# ============================================================================

param (
    [string]$ApiUrl = "https://garage-parts-marketplace-official.onrender.com",
    [string]$AppKey = "base64:sM5Th/eioZw9bH6Hj6gsMw4ooLgjauK4bC1/9lpQr6E="
)

Write-Host "=== Garage Parts Marketplace - Remote Database Migration ===" -ForegroundColor Cyan
Write-Host "Target API: $ApiUrl" -ForegroundColor Gray

$headers = @{
    "Accept" = "application/json"
    "X-App-Key" = $AppKey
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
    $migrateRes = Invoke-RestMethod -Uri "$ApiUrl/api/v1/system/migrate-seed" -Method Post -Headers $headers -TimeoutSec 60
    Write-Host "Result:" -ForegroundColor Green
    $migrateRes | ConvertTo-Json -Depth 5
    Write-Host "`n[SUCCESS] Database migrations & seeders completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "`n[ERROR] Migration request failed: $_" -ForegroundColor Red
}

Write-Host "`n3. Verifying system health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$ApiUrl/api/v1/health" -Method Get -TimeoutSec 15
    $health | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Health check response error: $_" -ForegroundColor DarkYellow
}
