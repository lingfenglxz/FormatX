$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$release = Join-Path $root 'src-tauri\target\release'
$bundle = Join-Path $release 'bundle'
$source = Join-Path $release 'formatx.exe'
$portableDir = Join-Path $bundle 'FormatX-portable'
$portableExe = Join-Path $portableDir 'FormatX.exe'
$portableZip = Join-Path $bundle 'FormatX-portable.zip'

Push-Location $root
try {
  & npm.cmd run tauri build
  if ($LASTEXITCODE -ne 0) { throw "Tauri build failed with exit code $LASTEXITCODE." }
} finally {
  Pop-Location
}

if (-not (Test-Path $source)) { throw "Missing build output: $source" }
Remove-Item -Recurse -Force $portableDir -ErrorAction SilentlyContinue
Remove-Item -Force $portableZip -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $portableDir | Out-Null
Copy-Item $source $portableExe
Compress-Archive -Path $portableDir -DestinationPath $portableZip
Write-Host "Portable package: $portableZip"
