@echo off
chcp 65001 >nul
title KingCong TTS Tool

echo ========================================
echo    KingCong TTS Tool - Windows
echo ========================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please download and install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Show Node version
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Node.js version: %NODE_VER%

:: Check npm
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not installed!
    pause
    exit /b 1
)

:: Check node_modules
if not exist "node_modules" (
    echo.
    echo [INFO] Installing dependencies...
    echo This may take a few minutes on first run.
    echo.
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencies installed successfully!
)

:: Start app
echo.
echo [INFO] Starting KingCong TTS Tool...
echo.
call npm start

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Application crashed or failed to start.
    pause
)
