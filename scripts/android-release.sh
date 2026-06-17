#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_BASE_URL="${API_BASE_URL:-https://eciperay.com/api}"
export API_BASE_URL
export APP_ENV=production

: "${SUPABASE_URL:?Export SUPABASE_URL before building a release APK}"
: "${SUPABASE_ANON_KEY:?Export SUPABASE_ANON_KEY before building a release APK}"

echo "Building Android release with API_BASE_URL=${API_BASE_URL}"

node packages/app/scripts/writeEnvShim.js

cd packages/app/android
./gradlew assembleRelease "$@"

APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [[ -f "$APK_PATH" ]]; then
  echo "Release APK: packages/app/android/${APK_PATH}"
fi
