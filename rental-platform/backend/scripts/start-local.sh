#!/usr/bin/env bash
# Start the bestflats.vip backend locally on the LAN IP using an in-memory Mongo.
# Reads the real secrets from the repo-root .env so existing admin tokens keep working.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
BACKEND_DIR="$ROOT_DIR/rental-platform/backend"

# Pull only the secrets we need from .env (without exporting the whole prod config).
get() { grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2-; }

export AUTH_JWT_SECRET="$(get AUTH_JWT_SECRET)"
export MASTER_ENCRYPTION_KEY="$(get MASTER_ENCRYPTION_KEY)"
export PLATFORM_ADMIN_KEY="$(get PLATFORM_ADMIN_KEY)"

# Local run settings (override the production values from .env).
export NODE_ENV=development
export PORT="${PORT:-4000}"
export FRONTEND_ORIGIN="http://localhost:3000,http://192.168.1.104:3000"
export AUTH_LOG_EMAIL_TOKEN=true          # surface magic tokens in logs (no SMTP needed)
export GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-267767178841-edgq3urk96c03b1ibdnolmj8nhv8rsun.apps.googleusercontent.com}"

# Stamp version metadata for GET /version (mirrors what the Pi build bakes in).
export GIT_COMMIT="${GIT_COMMIT:-$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)}"
export BUILD_TIME="${BUILD_TIME:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"

# Make sure no production SMTP/Mongo leaks in.
unset SMTP_URL SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS MONGO_URI

cd "$BACKEND_DIR"
echo "Starting backend on 0.0.0.0:$PORT (LAN: http://192.168.1.104:$PORT)"
exec node scripts/local-server.mjs
