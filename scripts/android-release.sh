#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="${ROOT}/packages/app/android"
ROOT_PACKAGE_JSON="${ROOT}/package.json"

if [[ ! -f "${ROOT_PACKAGE_JSON}" ]]; then
  echo "Missing ${ROOT_PACKAGE_JSON}"
  exit 1
fi

VERSION_NAME="$(node -p "require('${ROOT_PACKAGE_JSON}').version")"
if [[ -z "${VERSION_NAME}" ]]; then
  echo "version is not set in ${ROOT_PACKAGE_JSON}"
  exit 1
fi
