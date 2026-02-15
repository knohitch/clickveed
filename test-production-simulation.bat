@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo PRODUCTION SIMULATION TEST SUITE
echo ==========================================
echo.

set ERRORS=0
set WARNINGS=0

echo 1. Checking TypeScript compilation...
echo -------------------------------------------
call npx tsc --noEmit > tsc-output.log 2>&1
if !ERRORLEVEL! EQU 0 (
    echo [OK] TypeScript compilation successful
) else (
    echo [ERROR] TypeScript compilation failed
    set /a ERRORS+=1
    type tsc-output.log
)
echo.

echo 2. Running ESLint...
echo -------------------------------------------
if exist "node_modules\.bin\eslint.cmd" (
    call npx eslint src --max-warnings 0 > eslint-output.log 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo [OK] ESLint check passed
    ) else (
        echo [WARNING] ESLint check has warnings
        set /a WARNINGS+=1
        type eslint-output.log
    )
) else (
    echo [SKIP] ESLint not installed
)
echo.

echo 3. Checking for common production issues...
echo -------------------------------------------

REM Check for console.log in production code
findstr /S /C:"console.log" src\app\*.tsx src\components\*.tsx src\lib\*.ts > console-check.log 2>nul
if !ERRORLEVEL! EQU 0 (
    echo [WARNING] Found console.log statements in production code
    set /a WARNINGS+=1
) else (
    echo [OK] No console.log statements found
)

REM Check for React Hook violations
findstr /S /C:"useAuth\(\)" src\app\*.tsx src\components\*.tsx > hook-check.log 2>nul
if !ERRORLEVEL! EQU 0 (
    echo [INFO] Found useAuth hooks - verifying proper usage
    REM Check if useAuth is called inside useEffect
    findstr /S /C:"useEffect" src\app\*.tsx | findstr /C:"useAuth" > illegal-hook-check.log 2>nul
    if !ERRORLEVEL! EQU 0 (
        echo [ERROR] Potential React Hook violations detected
        set /a ERRORS+=1
        type illegal-hook-check.log
    ) else (
        echo [OK] React Hooks used correctly
    )
)
echo.

echo 4. Checking deployment configurations...
echo -------------------------------------------
if exist "Dockerfile" (
    echo [OK] Docker configuration found
) else (
    echo [WARNING] No Docker configuration found
    set /a WARNINGS+=1
)

if exist "docker-compose.yml" (
    echo [OK] Docker Compose configuration found
)

if exist "apphosting.yaml" (
    echo [OK] Firebase App Hosting configuration found
)

if exist "coolify.json" (
    echo [OK] Coolify configuration found
)

if exist "caprover-app.json" (
    echo [OK] CapRover configuration found
)
echo.

echo 5. Checking environment variables...
echo -------------------------------------------
if exist ".env.example" (
    echo [OK] .env.example exists
    findstr /C:"DATABASE_URL" .env.example >nul 2>&1 && echo [OK] DATABASE_URL documented
    findstr /C:"NEXTAUTH_SECRET" .env.example >nul 2>&1 && echo [OK] NEXTAUTH_SECRET documented
    findstr /C:"AUTH_SECRET" .env.example >nul 2>&1 && echo [OK] AUTH_SECRET documented
    findstr /C:"STRIPE_SECRET_KEY" .env.example >nul 2>&1 && echo [OK] STRIPE_SECRET_KEY documented
) else (
    echo [WARNING] .env.example not found
    set /a WARNINGS+=1
)
echo.

echo 6. Checking package.json scripts...
echo -------------------------------------------
findstr /C:"\"build\"" package.json >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo [OK] Build script present
) else (
    echo [ERROR] Build script missing
    set /a ERRORS+=1
)

findstr /C:"\"start\"" package.json >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo [OK] Start script present
) else (
    echo [ERROR] Start script missing
    set /a ERRORS+=1
)
echo.

echo 7. Checking Next.js configuration...
echo -------------------------------------------
if exist "next.config.mjs" (
    echo [OK] Next.js configuration found
    findstr /C:"output: 'standalone'" next.config.mjs >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo [OK] Standalone output configured for Docker
    ) else (
        echo [WARNING] Standalone output not configured
        set /a WARNINGS+=1
    )
) else (
    echo [ERROR] Next.js configuration missing
    set /a ERRORS+=1
)
echo.

echo ==========================================
echo SIMULATION SUMMARY
echo ==========================================
echo Errors: %ERRORS%
echo Warnings: %WARNINGS%
echo.

if %ERRORS% EQU 0 (
    echo [SUCCESS] Ready for production deployment!
    exit /b 0
) else (
    echo [FAILED] Cannot deploy to production. Please fix errors.
    exit /b 1
)
