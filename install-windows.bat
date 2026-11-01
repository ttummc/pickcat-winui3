@echo off
setlocal EnableDelayedExpansion
title PickCat WinUI 3 - Installer

set "URL=https://github.com/ttummc/pickcat-winui3/releases/latest/download/PickCat-WinUI3-extension.zip"
set "DEST=%LOCALAPPDATA%\PickCatWinUI3"
set "ZIP=%TEMP%\PickCat-WinUI3-extension.zip"

echo.
echo   PickCat WinUI 3 - installer
echo   ---------------------------
echo.
echo   Target: %DEST%
echo.

if exist "%ZIP%" del /q "%ZIP%"

echo   [1/3] Downloading...
where curl >nul 2>&1
if %errorlevel%==0 (
  curl -L --fail --silent --show-error -o "%ZIP%" "%URL%"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "try { Invoke-WebRequest -Uri '%URL%' -OutFile '%ZIP%' -UseBasicParsing } catch { exit 1 }"
)
if not exist "%ZIP%" goto :failed

echo   [2/3] Extracting...
if exist "%DEST%" rmdir /s /q "%DEST%" >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { Expand-Archive -Path '%ZIP%' -DestinationPath '%DEST%' -Force } catch { exit 1 }"
if not exist "%DEST%\manifest.json" goto :failed

echo   [3/3] Done.
echo.
echo   ============================================================
echo    Next, in the Chrome tab that just opened:
echo      1. turn on  Developer mode  (top-right)
echo      2. click    Load unpacked
echo      3. paste this folder:
echo.
echo         %DEST%
echo.
echo    The path is already on your clipboard - just press Ctrl+V.
echo   ============================================================
echo.

echo %DEST%| clip >nul 2>&1
start "" "chrome://extensions"

echo   Opening https://pickcat.dao3.fun/ in 5 seconds...
timeout /t 5 /nobreak >nul
start "" "https://pickcat.dao3.fun/"

echo.
pause
exit /b 0

:failed
echo.
echo   Install failed. Please check your network, or download the zip manually:
echo   %URL%
echo.
echo   Then extract it yourself and use "Load unpacked" in chrome://extensions.
echo.
pause
exit /b 1
