# Build an internal preview (APK on Android) via EAS — profile "preview" in eas.json
# Usage:
#   .\scripts\build-preview.ps1
#   .\scripts\build-preview.ps1 -Platform android
#   .\scripts\build-preview.ps1 -Platform ios
#   .\scripts\build-preview.ps1 -Local
#   .\scripts\build-preview.ps1 -NoWait

param(
    [ValidateSet("android", "ios", "all")]
    [string] $Platform = "android",

    [switch] $Local,
    [switch] $NoWait,
    [switch] $ClearCache
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

# Node 24.13+ on Windows can fail Expo GraphQL (empty "reason:"). Prefer IPv4 for DNS.
if (-not $env:NODE_OPTIONS) {
    $env:NODE_OPTIONS = "--dns-result-order=ipv4first"
} elseif ($env:NODE_OPTIONS -notmatch "dns-result-order") {
    $env:NODE_OPTIONS = "$env:NODE_OPTIONS --dns-result-order=ipv4first"
}

function Write-Step([string] $Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Ensure-EasCli {
    $eas = Get-Command eas -ErrorAction SilentlyContinue
    if (-not $eas) {
        Write-Step "EAS CLI not found. Installing eas-cli globally..."
        npm install -g eas-cli@latest
    }
    $version = (eas --version 2>&1) | Out-String
    Write-Host "EAS CLI: $($version.Trim())"
}

function Ensure-LoggedIn {
    Write-Step "Checking Expo login..."
    $whoami = eas whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Not logged in. Running eas login..." -ForegroundColor Yellow
        eas login
        if ($LASTEXITCODE -ne 0) {
            throw "eas login failed. Sign in at https://expo.dev then retry."
        }
    } else {
        Write-Host $whoami
    }
}

Write-Step "Square preview build (EAS profile: preview)"
Write-Host "Project: $ProjectRoot"
Write-Host "Platform: $Platform | Local: $Local | Wait for finish: $(-not $NoWait)"

Ensure-EasCli
Ensure-LoggedIn

if (-not (Test-Path "eas.json")) {
    throw "eas.json not found. Run this script from the app root."
}

if (-not (Test-Path "android\app\google-services.json")) {
    Write-Host "WARNING: android\app\google-services.json is missing. FCM may not work in the preview build." -ForegroundColor Yellow
}

$argsList = @("build", "--profile", "preview", "--non-interactive")
if ($Platform -ne "all") {
    $argsList += @("--platform", $Platform)
} else {
    $argsList += @("--platform", "all")
}
if ($Local) { $argsList += "--local" }
if ($NoWait) { $argsList += "--no-wait" }
if ($ClearCache) { $argsList += "--clear-cache" }

Write-Step "Starting EAS build..."
Write-Host "eas $($argsList -join ' ')" -ForegroundColor DarkGray

& eas @argsList
$exit = $LASTEXITCODE

if ($exit -ne 0) {
    Write-Host ""
    Write-Host "Build command failed (exit $exit)." -ForegroundColor Red
    Write-Host "Tips:" -ForegroundColor Yellow
    Write-Host "  - Shrink upload: keep .easignore excluding android/app/.cxx and android/app/build"
    Write-Host "  - Network errors: retry or use a stable connection"
    Write-Host "  - Logs: open the build URL from expo.dev or run with EXPO_DEBUG=1"
    exit $exit
}

Write-Step "Done"
if ($Platform -eq "android" -or $Platform -eq "all") {
    Write-Host "Android preview uses APK (internal). Install from the Expo build page or scan the QR after the build completes."
}
Write-Host "Dashboard: https://expo.dev/accounts/xeno_thetechguy/projects/dsquare4-0/builds"

exit 0
