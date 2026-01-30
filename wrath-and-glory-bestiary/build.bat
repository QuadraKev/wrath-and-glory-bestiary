@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"
echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo npm install failed!
    pause
    exit /b 1
)
echo.
echo Building Windows EXE...
call npm run build
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)
echo.
echo Build complete! Check the dist folder for your EXE.
pause
