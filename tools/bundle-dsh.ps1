# Bakes the DSH kernel into the desktop payload.
#
# The kernel is ~1 GB across thousands of files. Packing it as one zip keeps the WiX
# build fast and the MSI to a single large file; the app unpacks it on first run.
#
#   powershell -ExecutionPolicy Bypass -File tools\bundle-dsh.ps1
#   powershell -ExecutionPolicy Bypass -File tools\bundle-dsh.ps1 -Source "D:\DeepSeek Harness"

param(
    [string]$Source = (Join-Path $env:LOCALAPPDATA 'Programs\DeepSeek Harness'),
    [string]$Target = 'desktop\publish\dsh'
)

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

if (-not (Test-Path $Source)) {
    throw "DSH 未安装: $Source"
}

$cli = Join-Path $Source 'resources\runtime\cli\bin\dsh.cmd'
if (-not (Test-Path $cli)) {
    throw "该目录不是有效的 DSH 安装（缺少 resources\runtime\cli\bin\dsh.cmd）: $Source"
}

New-Item -ItemType Directory -Force $Target | Out-Null
$zip = Join-Path $Target 'payload.zip'
Remove-Item $zip -Force -ErrorAction SilentlyContinue

$mb = [Math]::Round((Get-ChildItem $Source -Recurse -File | Measure-Object Length -Sum).Sum / 1MB, 0)
Write-Host "  源目录 $mb MB"
Write-Host "  压缩中..."

Add-Type -AssemblyName System.IO.Compression.FileSystem
$sw = [System.Diagnostics.Stopwatch]::StartNew()
# includeBaseDirectory=false: the app extracts straight into <install>\dsh.
[System.IO.Compression.ZipFile]::CreateFromDirectory(
    $Source, $zip, [System.IO.Compression.CompressionLevel]::Fastest, $false)
$sw.Stop()

$zipMb = [Math]::Round((Get-Item $zip).Length / 1MB, 1)
(Get-FileHash $zip -Algorithm SHA256).Hash.ToLower() | Out-File "$zip.sha256" -Encoding ascii -NoNewline

Write-Host "  $zipMb MB  用时 $([Math]::Round($sw.Elapsed.TotalSeconds,1)) 秒"
Write-Host "  $zip"
