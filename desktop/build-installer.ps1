# Builds the desktop app and packages it into a Windows installer (MSI).
#
#   powershell -NoProfile -File desktop\build-installer.ps1
#
# Output: desktop\dist\PickCatWinUI3-Setup-<version>.msi

param(
    [string]$Configuration = "Release",
    [string]$Runtime = "win-x64",
    [string]$Platform = "x64",
    [string]$Version = "1.0.0"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$project = Join-Path $PSScriptRoot "PickCat.WinUI3"
$publish = Join-Path $PSScriptRoot "publish"
$dist = Join-Path $PSScriptRoot "dist"
$installer = Join-Path $root "installer"

$dotnet = "C:\Program Files\dotnet\dotnet.exe"
if (-not (Test-Path $dotnet)) {
    $cmd = Get-Command dotnet -ErrorAction SilentlyContinue
    if (-not $cmd) { throw "dotnet SDK not found. Install it with: winget install Microsoft.DotNet.SDK.10" }
    $dotnet = $cmd.Source
}

$wix = Join-Path $env:USERPROFILE ".dotnet\tools\wix.exe"
if (-not (Test-Path $wix)) {
    $cmd = Get-Command wix -ErrorAction SilentlyContinue
    if (-not $cmd) { throw "WiX not found. Install it with: dotnet tool install --global wix" }
    $wix = $cmd.Source
}

Write-Host "[1/4] Building the web bundle (shared with the extension)"
Push-Location (Join-Path $root "extension")
try {
    $env:TEMP = Join-Path $root ".tmp"; $env:TMP = $env:TEMP
    New-Item -ItemType Directory -Force $env:TEMP | Out-Null
    & npx vite build
    if ($LASTEXITCODE -ne 0) { throw "vite build failed" }
}
finally { Pop-Location }

Write-Host "[2/4] Publishing a self-contained build to desktop\publish"
# A stale publish folder silently keeps the previous DLL, so always start clean.
if (Test-Path $publish) { Remove-Item -Recurse -Force $publish }
& $dotnet publish (Join-Path $project "PickCat.WinUI3.csproj") `
    -c $Configuration -r $Runtime --self-contained true `
    -p:WindowsAppSDKSelfContained=true -p:Platform=$Platform -o $publish
if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed" }

# The app's own resource index is dropped by publish (see the csproj target); verify.
if (-not (Test-Path (Join-Path $publish "PickCatWinUI3.pri"))) {
    throw "PickCatWinUI3.pri missing from publish output - the app would crash on start"
}

Write-Host "[3/4] Building the MSI"
New-Item -ItemType Directory -Force $dist | Out-Null
Push-Location $installer
try {
    & $wix build "PickCatWinUI3.wxs" `
        -d Version=$Version `
        -arch x64 `
        -out (Join-Path $dist "PickCatWinUI3-Setup-$Version.msi")
    if ($LASTEXITCODE -ne 0) { throw "wix build failed" }
}
finally { Pop-Location }

Write-Host "[4/4] Done"
Get-ChildItem $dist -Filter "*.msi" | ForEach-Object {
    Write-Host ("  {0}  ({1:N1} MB)" -f $_.Name, ($_.Length / 1MB))
}
