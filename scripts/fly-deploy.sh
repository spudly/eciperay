#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v fly >/dev/null 2>&1; then
  echo "Install flyctl: https://fly.io/docs/flyctl/install/"
  exit 1
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${VITE_SUPABASE_URL:?Set VITE_SUPABASE_URL in .env or the environment}"
: "${VITE_SUPABASE_ANON_KEY:?Set VITE_SUPABASE_ANON_KEY in .env or the environment}"

VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api}"

echo "Deploying to Fly (web build uses public Supabase anon values from .env)..."
fly deploy \
  --build-arg "VITE_API_BASE_URL=${VITE_API_BASE_URL}" \
  --build-arg "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}" \
  --build-arg "VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}" \
  --build-arg "VITE_POSTHOG_KEY=${VITE_POSTHOG_KEY:-}" \
  --build-arg "VITE_POSTHOG_HOST=${VITE_POSTHOG_HOST:-https://us.i.posthog.com}" \
  --build-arg "POSTHOG_API_KEY=${POSTHOG_API_KEY:-}" \
  --build-arg "POSTHOG_PROJECT_ID=${POSTHOG_PROJECT_ID:-}" \
  --build-arg "POSTHOG_API_HOST=${POSTHOG_API_HOST:-https://us.posthog.com}" \
  --build-arg "GITHUB_SHA=$(git rev-parse HEAD)" \
  "$@"
