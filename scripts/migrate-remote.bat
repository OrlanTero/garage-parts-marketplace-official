@echo off
REM ============================================================================
REM Garage Parts Marketplace - Remote Migration Launcher (.bat)
REM ============================================================================

powershell -ExecutionPolicy Bypass -File "%~dp0migrate-remote.ps1" %*
pause
