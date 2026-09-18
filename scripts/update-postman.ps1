# ============================================================================
# Garage Parts Marketplace - Postman Collection Generator & Updater (PowerShell)
# ============================================================================

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  Garage Marketplace - Updating Postman API Collection   " -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ScriptDir "..\backend"

Set-Location $BackendDir

php artisan postman:generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[SUCCESS] Postman collection updated at: docs\postman\garage-parts-session.postman_collection.json" -ForegroundColor Green
    Write-Host "Import this file into Postman -> Import -> File / Drag & Drop!`n" -ForegroundColor Yellow
} else {
    Write-Host "`n[ERROR] Command failed with exit code $LASTEXITCODE. Please check PHP runtime." -ForegroundColor Red
}
