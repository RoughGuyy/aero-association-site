param([Parameter(ValueFromRemainingArguments = $true)][string[]]$WranglerArgs)
$toolRoot = 'D:\Codex\Workspaces\aero-guide-tools'
$env:XDG_CONFIG_HOME = Join-Path $toolRoot 'config'
$env:WRANGLER_LOG_PATH = Join-Path $toolRoot 'logs'
$env:WRANGLER_SEND_METRICS = 'false'
$env:TEMP = Join-Path $toolRoot 'temp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force -Path $env:XDG_CONFIG_HOME, $env:WRANGLER_LOG_PATH, $env:TEMP | Out-Null
Push-Location $PSScriptRoot
try {
    & node 'node_modules/wrangler/bin/wrangler.js' @WranglerArgs
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
