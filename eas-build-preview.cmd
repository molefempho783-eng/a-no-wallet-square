@echo off
REM Fix Expo GraphQL on Windows + Node 24: force IPv4 DNS (see scripts/eas.ps1)
set NODE_OPTIONS=--dns-result-order=ipv4first
cd /d "%~dp0"
echo NODE_OPTIONS=%NODE_OPTIONS%
echo Running: eas build -p android --profile preview %*
call eas build -p android --profile preview %*
exit /b %ERRORLEVEL%
