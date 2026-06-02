# Run any EAS command with Windows/Node 24 network fix for api.expo.dev GraphQL.
# Usage:
#   .\scripts\eas.ps1 whoami
#   .\scripts\eas.ps1 build --platform android --profile preview
#   .\scripts\eas.ps1 login

param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $EasArgs
)

if ($EasArgs.Count -eq 0) {
    Write-Host "Usage: .\scripts\eas.ps1 <eas-args...>" -ForegroundColor Yellow
    Write-Host "Example: .\scripts\eas.ps1 build --platform android --profile preview"
    exit 1
}

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

if (-not $env:NODE_OPTIONS) {
    $env:NODE_OPTIONS = "--dns-result-order=ipv4first"
} elseif ($env:NODE_OPTIONS -notmatch "dns-result-order") {
    $env:NODE_OPTIONS = "$env:NODE_OPTIONS --dns-result-order=ipv4first"
}

Write-Host "NODE_OPTIONS=$env:NODE_OPTIONS" -ForegroundColor DarkGray
& eas @EasArgs
exit $LASTEXITCODE
