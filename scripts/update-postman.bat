@echo off
REM ============================================================================
REM Garage Parts Marketplace - Postman Collection Generator & Updater
REM ============================================================================

echo [Garage Marketplace] Updating Postman Collection API list...

cd /d "%~dp0\..\backend"
php artisan postman:generate

if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] Postman collection updated at: docs\postman\garage-parts-session.postman_collection.json
    echo You can now import this file directly into Postman!
) else (
    echo.
    echo [ERROR] Failed to generate Postman collection. Please ensure PHP is installed and configured.
)
pause
