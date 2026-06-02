#!/usr/bin/env bash
# Build installable preview binaries via EAS (Android APK + iOS internal IPA).
# Usage:
#   ./scripts/build-preview.sh              # Android APK only
#   ./scripts/build-preview.sh ios          # iOS internal build
#   ./scripts/build-preview.sh all          # Both platforms
#   ./scripts/build-preview.sh android --no-wait

set -euo pipefail
cd "$(dirname "$0")/.."

PLATFORM="${1:-android}"
NO_WAIT=""
CLEAR_CACHE=""

shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-wait) NO_WAIT="--no-wait" ;;
    --clear-cache) CLEAR_CACHE="--clear-cache" ;;
    android|ios|all) PLATFORM="$1" ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
  shift
done

if ! command -v eas >/dev/null 2>&1; then
  echo "Installing EAS CLI..."
  npm install -g eas-cli@latest
fi

echo "EAS CLI: $(eas --version)"
echo "Checking Expo login..."
if ! eas whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: eas login"
  eas login
fi
eas whoami

if [[ ! -f eas.json ]]; then
  echo "eas.json not found"
  exit 1
fi

if [[ ! -f android/app/google-services.json ]]; then
  echo "WARNING: android/app/google-services.json missing — push may not work on Android."
fi

ARGS=(build --profile preview --non-interactive $NO_WAIT $CLEAR_CACHE)
case "$PLATFORM" in
  android) ARGS+=(--platform android) ;;
  ios) ARGS+=(--platform ios) ;;
  all) ARGS+=(--platform all) ;;
  *) echo "Platform must be android, ios, or all"; exit 1 ;;
esac

echo ""
echo "==> Starting EAS build: eas ${ARGS[*]}"
eas "${ARGS[@]}"

echo ""
echo "==> Done. Open builds:"
echo "https://expo.dev/accounts/xeno_thetechguy/projects/dsquare4-0/builds"
