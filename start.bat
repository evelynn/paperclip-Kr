@echo off
chcp 65001 >nul 2>&1
title Paperclip Server

:: Auto-elevate to administrator. Codex auth.json seeding creates a symlink,
:: which Windows refuses for non-elevated users (EPERM) unless Developer Mode
:: is on. Relaunch this script via UAC if we are not already elevated.
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo   [!] Administrator privileges required. Requesting elevation...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

echo.
echo   ==============================
echo    Paperclip Server Starting...
echo   ==============================
echo.

:: Build check
if not exist "server\dist\index.js" (
    echo   [!] Build not found. Running pnpm build...
    echo.
    call pnpm build
    if errorlevel 1 (
        echo.
        echo   [ERROR] Build failed.
        pause
        exit /b 1
    )
)

:: Start server
echo   Server: http://127.0.0.1:3100
echo   Press Ctrl+C to stop.
echo.

node --import ./server/node_modules/tsx/dist/loader.mjs server/dist/index.js

pause
