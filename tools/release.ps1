# 发布流程：改完代码后一条命令跑完全部同步
#
#   pwsh -File tools/release.ps1 -Version 1.0.5
#
# 依次完成：升版本号 → 构建扩展 → 同步安装目录 → 打包 zip → 同步桌面版 Assets →
# publish → 构建 MSI → 复制到桌面和 Downloads → 提交并打 tag 触发 CI 发布。
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

function Step($text) { Write-Host "`n=== $text ===" -ForegroundColor Cyan }

# 1. 版本号：扩展 manifest 与桌面工程保持一致
Step "版本 -> $Version"
$node = @"
import fs from "node:fs";
const m = JSON.parse(fs.readFileSync("extension/public/manifest.json", "utf8"));
m.version = "$Version";
fs.writeFileSync("extension/public/manifest.json", JSON.stringify(m, null, 2) + "\n");
const c = "desktop/PickCat.WinUI3/PickCat.WinUI3.csproj";
let s = fs.readFileSync(c, "utf8").replace(/<Version>[^<]+<\/Version>/, "<Version>$Version</Version>");
fs.writeFileSync(c, s);
"@
$node | Out-File -Encoding utf8 .tmp-bump.mjs
node .tmp-bump.mjs
Remove-Item .tmp-bump.mjs -Force

# 2. 构建扩展
Step '构建扩展'
Push-Location extension
npx vite build
Pop-Location

# 3. 同步到扩展安装目录
Step '同步安装目录'
$installDir = Join-Path $env:USERPROFILE 'PickCatWinUI3'
if (Test-Path (Join-Path $installDir 'manifest.json')) {
  Get-ChildItem $installDir -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  Copy-Item 'extension\dist\*' $installDir -Recurse -Force
  Write-Host "  -> $installDir"
} else {
  Write-Host "  跳过：$installDir 不存在" -ForegroundColor Yellow
}

# 4. 打包扩展
Step '打包扩展'
Remove-Item -Recurse -Force extension\dist\_metadata -ErrorAction SilentlyContinue
if (Test-Path PickCat-WinUI3-extension.zip) { Remove-Item PickCat-WinUI3-extension.zip -Force }
Compress-Archive -Path 'extension\dist\*' -DestinationPath 'PickCat-WinUI3-extension.zip' -CompressionLevel Optimal
Copy-Item PickCat-WinUI3-extension.zip (Join-Path $env:USERPROFILE 'Downloads\PickCat-WinUI3-extension.zip') -Force
Write-Host "  $([Math]::Round((Get-Item 'PickCat-WinUI3-extension.zip').Length/1MB,2)) MB -> Downloads"

# 5. 桌面版：同步 Assets 并 publish
Step '构建桌面版'
Copy-Item extension\dist\content.js desktop\PickCat.WinUI3\Assets -Force
Copy-Item extension\dist\content.css desktop\PickCat.WinUI3\Assets -Force
Get-Process PickCatWinUI3, msedgewebview2 -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
if (Test-Path desktop\publish) { Remove-Item desktop\publish -Recurse -Force }
& 'C:\Program Files\dotnet\dotnet.exe' publish desktop\PickCat.WinUI3\PickCat.WinUI3.csproj `
  -c Release -r win-x64 --self-contained -o desktop\publish | Out-Null
if (-not (Test-Path desktop\publish\PickCatWinUI3.pri)) { throw 'publish 缺少 PickCatWinUI3.pri，程序会静默崩溃' }

# 6. MSI
Step '构装 MSI'
$wix = Join-Path $env:USERPROFILE '.dotnet\tools\wix.exe'
$pub = (Resolve-Path desktop\publish).Path
& $wix build installer\PickCatWinUI3.wxs `
  -d PublishDir="$pub" -d Version=$Version `
  -ext WixToolset.Util.wixext/5.0.2 `
  -o "desktop\dist\PickCatWinUI3-Setup-$Version.msi"
if ($LASTEXITCODE -ne 0) { throw 'wix build 失败' }

$msi = "desktop\dist\PickCatWinUI3-Setup-$Version.msi"
Copy-Item $msi (Join-Path $env:USERPROFILE "Downloads\PickCatWinUI3-Setup-$Version.msi") -Force
Copy-Item $msi (Join-Path ([Environment]::GetFolderPath('Desktop')) "PickCatWinUI3-Setup-$Version.msi") -Force
$sha = (Get-FileHash $msi -Algorithm SHA256).Hash.ToLower()
Write-Host "  $([Math]::Round((Get-Item $msi).Length/1MB,2)) MB  SHA256 $sha"

# 7. 提交并触发 CI
if (-not $SkipPush) {
  Step '提交与推送'
  $env:GIT_TERMINAL_PROMPT = '0'
  git add -A | Out-Null
  git commit -m "release: v$Version" -q
  git push origin main
  git tag -a "v$Version" -m "v$Version" 2>$null
  git push origin "v$Version"
  Write-Host "  已推送 tag v$Version，CI 会构建 MSI 并附到 Release"
}

Write-Host "`n完成。" -ForegroundColor Green
