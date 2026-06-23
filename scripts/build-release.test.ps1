$root = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $PSScriptRoot 'build-release.ps1'
if (-not (Test-Path $scriptPath)) { throw 'Missing build-release.ps1.' }

$script = Get-Content -Raw -Encoding UTF8 $scriptPath
foreach ($required in 'FormatX.exe', 'FormatX-portable.zip', 'Compress-Archive') {
  if ($script -notmatch [regex]::Escape($required)) { throw "Release script is missing $required." }
}

$config = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'src-tauri\tauri.conf.json') | ConvertFrom-Json
if ($config.bundle.windows.wix.language -notcontains 'zh-CN') { throw 'MSI must include zh-CN.' }

$buildScript = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'src-tauri\build.rs')
if ($buildScript -notmatch [regex]::Escape('cargo:rerun-if-changed=icons/icon.ico')) { throw 'Icon changes must trigger an executable rebuild.' }
