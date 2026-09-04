@echo off
setlocal enabledelayedexpansion

echo ===============================================================================
echo                AEGIS — THE GROWTH-AND-TRUST AGENT FOR AGENTIC COMMERCE
echo                                 ONE-CLICK DEMO RUNNER
echo ===============================================================================
echo.

set ROOT_DIR=%~dp0
set BACKEND_DIR=%ROOT_DIR%backend
set FRONTEND_DIR=%ROOT_DIR%frontend

echo [1/3] Verifying Python and Node environments...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found in PATH.
    pause
    exit /b 1
)

node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found in PATH.
    pause
    exit /b 1
)

echo [2/3] Checking Aegis CLI system status...
call "%ROOT_DIR%aegis.bat" system status

echo.
echo [3/3] Demo Options:
echo   1. Start Full Stack (FastAPI Backend + Vite Frontend)
echo   2. Run Complete End-to-End Story (CLI: Growth -> Purchase -> Attack -> Ledger -> Replay)
echo   3. Run Adversarial Attack Defense Simulation (Amount Escalation)
echo   4. Verify Cryptographic Audit Ledger Integrity
echo   5. Exit
echo.

set /p OPTION="Select option [1-5]: "

if "%OPTION%"=="1" (
    echo.
    echo Starting FastAPI Backend on http://127.0.0.1:8000 ...
    start "Aegis Backend" cmd /k "cd /d %BACKEND_DIR% && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
    timeout /t 3 /nobreak >nul
    echo Starting Vite React Dashboard on http://127.0.0.1:5173 ...
    start "Aegis Frontend" cmd /k "cd /d %FRONTEND_DIR% && npm run dev"
    echo.
    echo Services launched! Open http://localhost:5173 in your browser.
    pause
    exit /b 0
)

if "%OPTION%"=="2" (
    echo.
    echo Running Unified Autonomous Demo...
    call "%ROOT_DIR%aegis.bat" demo full
    pause
    exit /b 0
)

if "%OPTION%"=="3" (
    echo.
    echo Running Attack Lab Simulation...
    call "%ROOT_DIR%aegis.bat" attack run amount-escalation
    pause
    exit /b 0
)

if "%OPTION%"=="4" (
    echo.
    echo Verifying Cryptographic Ledger...
    call "%ROOT_DIR%aegis.bat" ledger verify
    pause
    exit /b 0
)

echo Exiting Aegis Demo Runner.
