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

# Paddle web config (docs/paddle-live-cutover.md): sandbox unless .env
# opts into the live catalog. Only pass the client token when set — an
# empty --build-arg would override the Dockerfile's sandbox default.
VITE_PADDLE_ENVIRONMENT="${VITE_PADDLE_ENVIRONMENT:-sandbox}"
PADDLE_ARGS=()
if [[ -n "${VITE_PADDLE_CLIENT_TOKEN:-}" ]]; then
  PADDLE_ARGS+=(--build-arg "VITE_PADDLE_CLIENT_TOKEN=${VITE_PADDLE_CLIENT_TOKEN}")
fi
if [[ "$VITE_PADDLE_ENVIRONMENT" == "production" && -z "${VITE_PADDLE_CLIENT_TOKEN:-}" ]]; then
  echo "VITE_PADDLE_ENVIRONMENT=production but VITE_PADDLE_CLIENT_TOKEN (live Paddle client token) is not set in .env — refusing to deploy." >&2
  exit 1
fi

echo "Deploying to Fly (web build uses public Supabase anon values from .env)..."
fly deploy \
  --build-arg "VITE_API_BASE_URL=${VITE_API_BASE_URL}" \
  --build-arg "VITE_PADDLE_ENVIRONMENT=${VITE_PADDLE_ENVIRONMENT}" \
  "${PADDLE_ARGS[@]}" \
  --build-arg "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}" \
  --build-arg "VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}" \
  --build-arg "VITE_POSTHOG_KEY=${VITE_POSTHOG_KEY:-}" \
  --build-arg "VITE_POSTHOG_HOST=${VITE_POSTHOG_HOST:-https://us.i.posthog.com}" \
  --build-arg "POSTHOG_API_KEY=${POSTHOG_API_KEY:-}" \
  --build-arg "POSTHOG_PROJECT_ID=${POSTHOG_PROJECT_ID:-}" \
  --build-arg "POSTHOG_API_HOST=${POSTHOG_API_HOST:-https://us.posthog.com}" \
  --build-arg "GITHUB_SHA=$(git rev-parse HEAD)" \
  "$@"
