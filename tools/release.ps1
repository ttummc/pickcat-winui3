<#
  One-shot release: bump version, build, sync everywhere, publish MSI, push + tag.

    powershell -ExecutionPolicy Bypass -File tools\release.ps1 -Version 1.0.6

  PowerShell 5.1 reads non-BOM UTF-8 as ANSI, so this file is saved WITH a BOM.
#>
param(
  [Parameter(Mandatory = $true)][string]$Version,
  [switch]$SkipPush
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$env:TEMP = Join-Path $root '.tmp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force $env:TEMP | Out-Null

function Step([string]$text) { Write-Host ""; Write-Host "=== $text ===" -ForegroundColor Cyan }

Step "version -> $Version"
$bump = Join-Path $env:TEMP 'bump.mjs'
@"
import fs from 'node:fs';
const v = '$Version';
const m = JSON.parse(fs.readFileSync('extension/public/manifest.json', 'utf8'));
m.version = v;
fs.writeFileSync('extension/public/manifest.json', JSON.stringify(m, null, 2) + '\n');
const c = 'desktop/PickCat.WinUI3/PickCat.WinUI3.csproj';
const s = fs.readFileSync(c, 'utf8').replace(/<Version>[^<]+<\/Version>/, '<Version>' + v + '</Version>');
fs.writeFileSync(c, s);
console.log('  manifest + csproj -> ' + v);
"@ | Out-File -FilePath $bump -Encoding utf8
node $bump
Remove-Item $bump -Force

Step 'release notes from CHANGELOG.md'
node tools/release-notes-for.mjs "v$Version" | Out-File -FilePath RELEASE_NOTES.md -Encoding utf8
Write-Host "  RELEASE_NOTES.md <- CHANGELOG.md v$Version"

Step 'build the extension'
Push-Location extension
npx vite build
Pop-Location

Step 'sync the install folder'
$installDir = Join-Path $env:USERPROFILE 'PickCatWinUI3'
if (Test-Path (Join-Path $installDir 'manifest.json')) {
  Get-ChildItem $installDir -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  Copy-Item 'extension\dist\*' $installDir -Recurse -Force
  Write-Host "  -> $installDir"
} else {
  Write-Host "  skipped: $installDir not found" -ForegroundColor Yellow
}

Step 'package the extension'
Remove-Item -Recurse -Force extension\dist\_metadata -ErrorAction SilentlyContinue
if (Test-Path PickCat-WinUI3-extension.zip) { Remove-Item PickCat-WinUI3-extension.zip -Force }
Compress-Archive -Path 'extension\dist\*' -DestinationPath 'PickCat-WinUI3-extension.zip' -CompressionLevel Optimal
Copy-Item PickCat-WinUI3-extension.zip (Join-Path $env:USERPROFILE 'Downloads\PickCat-WinUI3-extension.zip') -Force
$zipMb = [Math]::Round((Get-Item 'PickCat-WinUI3-extension.zip').Length / 1MB, 2)
Write-Host "  $zipMb MB -> Downloads"

Step 'archive this version'
New-Item -ItemType Directory -Force "releases\v$Version" | Out-Null
Copy-Item PickCat-WinUI3-extension.zip "releases\v$Version\PickCat-WinUI3-extension.zip" -Force
node tools/collect-releases.mjs | Out-Null
Write-Host "  releases/v$Version/PickCat-WinUI3-extension.zip"

Step 'publish the desktop app'
Copy-Item extension\dist\content.js desktop\PickCat.WinUI3\Assets -Force
Copy-Item extension\dist\content.css desktop\PickCat.WinUI3\Assets -Force
Get-Process PickCatWinUI3, msedgewebview2 -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
if (Test-Path desktop\publish) { Remove-Item desktop\publish -Recurse -Force }
& 'C:\Program Files\dotnet\dotnet.exe' publish desktop\PickCat.WinUI3\PickCat.WinUI3.csproj -c Release -r win-x64 --self-contained -o desktop\publish | Out-Null
if (-not (Test-Path desktop\publish\PickCatWinUI3.pri)) { throw 'publish is missing PickCatWinUI3.pri (the app would crash silently)' }

Step 'build the MSI'
$wix = Join-Path $env:USERPROFILE '.dotnet\tools\wix.exe'
$pub = (Resolve-Path desktop\publish).Path
$msi = "desktop\dist\PickCatWinUI3-Setup-$Version.msi"
Get-ChildItem desktop\dist -Filter '*.msi' -ErrorAction SilentlyContinue | Remove-Item -Force
& $wix build installer\PickCatWinUI3.wxs -d "PublishDir=$pub" -d "Version=$Version" -ext WixToolset.Util.wixext/5.0.2 -o $msi
if ($LASTEXITCODE -ne 0) { throw 'wix build failed' }

Copy-Item $msi (Join-Path $env:USERPROFILE "Downloads\PickCatWinUI3-Setup-$Version.msi") -Force
Copy-Item $msi (Join-Path ([Environment]::GetFolderPath('Desktop')) "PickCatWinUI3-Setup-$Version.msi") -Force
$sha = (Get-FileHash $msi -Algorithm SHA256).Hash.ToLower()
$msiMb = [Math]::Round((Get-Item $msi).Length / 1MB, 2)
Write-Host "  $msiMb MB  sha256 $sha"

if (-not $SkipPush) {
  Step 'commit, tag, push'
  $env:GIT_TERMINAL_PROMPT = '0'
  git add -A | Out-Null
  git commit -m "release: v$Version" -q
  git push origin main
  git tag -a "v$Version" -m "v$Version"
  git push origin "v$Version"
  Write-Host "  pushed tag v$Version - CI builds the MSI and attaches it to the release"
}

Write-Host ""
Write-Host 'done.' -ForegroundColor Green