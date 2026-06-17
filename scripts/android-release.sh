#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.production ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.production
  set +a
fi

API_BASE_URL="${API_BASE_URL:-https://eciperay.com/api}"
export API_BASE_URL
export APP_ENV=production

: "${SUPABASE_URL:?Set SUPABASE_URL in .env.production or the environment}"
: "${SUPABASE_ANON_KEY:?Set SUPABASE_ANON_KEY in .env.production or the environment}"

echo "Building Android release with API_BASE_URL=${API_BASE_URL}"

node packages/app/scripts/envShim.js

cd packages/app/android
./gradlew assembleRelease "$@"

APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [[ -f "$APK_PATH" ]]; then
  echo "Release APK: packages/app/android/${APK_PATH}"
fi
