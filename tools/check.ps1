# Fast loop: build -> restart Chrome -> load extension -> probe one route.
param(
  [string]$Hash = "#/settings",
  [string]$Name = "probe",
  [switch]$SkipBuild
)

$root = "C:\Users\tjh54\Desktop\PickCatButWinUI3OnWeb"
Set-Location $root

if (-not $SkipBuild) {
  Push-Location extension
  $env:TEMP = "$root\.tmp"
  $env:TMP = $env:TEMP
  npx vite build 2>&1 | Select-Object -Last 2
  Pop-Location
}

Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
  Where-Object { $_.CommandLine -like "*remote-debugging-port=9333*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$profile = Join-Path $root ".chrome-profile2"
Remove-Item "$profile\Singleton*" -Force -ErrorAction SilentlyContinue
Start-Process -FilePath $chrome -ArgumentList @(
  "--remote-debugging-port=9333",
  "--user-data-dir=`"$profile`"",
  "--enable-unsafe-extension-debugging",
  "--no-first-run", "--no-default-browser-check", "--no-sandbox",
  "--window-size=1440,900", "about:blank"
) | Out-Null
Start-Sleep -Seconds 5

node tools\verify-all.mjs $Name $Hash
