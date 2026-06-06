#!/bin/bash

# Unified Start Script for Rental Platform
# This script prepares the environment and starts the stack using Podman Compose.

set -e

# --- ARCHITECTURE & STORAGE OPTIMIZATION ---
ARCH=$(uname -m)
if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm"* ]]; then
    echo "🔍 Raspberry Pi (ARM) detected. Applying storage optimizations."
    
    USB_ROOT=$(find /media/benyedde -name "bestflats_data" -type d -print -quit 2>/dev/null | sed 's|/bestflats_data||')
    if [ -z "$USB_ROOT" ]; then
        # Fallback to the first available directory that isn't rootfs
        USB_ROOT=$(find /media/benyedde -maxdepth 1 -mindepth 1 -type d ! -name "rootfs" | head -n 1)
    fi
    
    if [ -n "$USB_ROOT" ] && [ -d "$USB_ROOT" ]; then
        echo "✅ Detected USB Mount: $USB_ROOT"
        
        # Aggressively ensure execution permissions
        sudo mount -o remount,rw,exec,dev,suid "$USB_ROOT" || true

        export MONGO_DATA_DIR="$USB_ROOT/bestflats_data/mongo"
        
        echo "📁 Preparing MongoDB data directory..."
        sudo mkdir -p "$MONGO_DATA_DIR"
        podman unshare chown -R 999:999 "$MONGO_DATA_DIR"
        echo "💾 Using USB Disk for Persistent Data."
    fi
else
    echo "💻 PC/Server ($ARCH) detected. Using local storage."
    export MONGO_DATA_DIR="./data/mongo"
    mkdir -p "$MONGO_DATA_DIR"
fi

# 1. Check for Prerequisites
command -v podman >/dev/null 2>&1 || { echo >&2 "❌ Podman is required but not installed. Aborting."; exit 1; }
command -v podman-compose >/dev/null 2>&1 || { echo >&2 "❌ podman-compose is required but not installed. Aborting."; exit 1; }

# 2. Environment Variables — .env is the operator-managed source of truth.
# This script NEVER creates, edits or deletes it; it only requires it to exist.
if [ ! -f .env ]; then
    echo "❌ .env not found at repo root. Create it manually (see rental-platform/.env.example)." >&2
    echo "   This script will not generate or modify .env." >&2
    exit 1
fi
echo "✅ .env file present — left untouched."

# Load brand name for script messages
BRAND_NAME=$(grep NEXT_PUBLIC_BRAND_NAME .env | cut -d '=' -f2- || echo "bestflats.vip")
echo "🚀 Starting $BRAND_NAME Deployment..."

# Propagate the managed root .env to where podman-compose reads it (one-way copy FROM
# the source of truth; the root .env itself is never modified).
cp .env rental-platform/.env

# 3. Build and Start
# Stamp the build with the current git commit + UTC time so GET /version reports it.
export GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)
export BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "🏗️  Building and starting services... (commit $GIT_COMMIT)"
(cd rental-platform && podman-compose build && podman-compose up -d)

# 4. Final verification steps... (renumbering)

# 5. Wait for the backend PROCESS to come up — bounded, never an infinite loop.
# Probe /version (no DB, not the rate-limited DB endpoints) so a database problem
# can't turn this into a forever-wait that hammers the API into a 429.
echo "⏳ Waiting for backend to be ready..."
READY=false
for _ in $(seq 1 40); do
    if curl --output /dev/null --silent --fail --max-time 5 http://localhost:4000/version; then
        READY=true; break
    fi
    printf '.'; sleep 3
done
echo
if [ "$READY" != true ]; then
    echo "⚠️  Backend did not answer /version after ~2 min. Check logs:"
    echo "    cd rental-platform && podman-compose logs --tail=80 backend"
    exit 1
fi
echo "✅ Backend process is up."

# 5b. Verify the database is actually queryable. A non-200 here means the backend is
# running but cannot talk to MongoDB — almost always MONGO_URI missing auth creds.
DB_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 http://localhost:4000/apartments || echo 000)
if [ "$DB_CODE" != "200" ]; then
    echo "⚠️  Backend is up but database queries return HTTP $DB_CODE (skipping seed)."
    echo "    Most likely MONGO_URI is missing auth credentials. In the root .env set e.g.:"
    echo "      MONGO_URI=mongodb://<user>:<pass>@mongo:27017/bestflats?authSource=admin"
    echo "    then restart: (cd rental-platform && podman-compose up -d backend)"
    echo "    (.env is operator-managed — fix it by hand; scripts never edit it.)"
    exit 1
fi

# 6. Seed the database with initial apartments (best-effort).
echo "🌱 Seeding database with initial apartments..."
ADMIN_KEY=$(grep PLATFORM_ADMIN_KEY .env | cut -d '=' -f2-)
curl -X GET -H "x-platform-admin-key: $ADMIN_KEY" "http://localhost:4000/seed/unprotected?force=true" || true
echo

echo "
✨ DEPLOYMENT COMPLETE! ✨

--------------------------------------------------
🖥️  Frontend: http://localhost:3000
⚙️  Backend:  http://localhost:4000
🤖 MCP SSE:  http://localhost:4000/mcp
--------------------------------------------------

To view logs, run:
cd rental-platform && podman-compose logs -f
"
