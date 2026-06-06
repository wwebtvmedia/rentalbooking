#!/bin/bash

# Clean Script for Rental Platform — FULL PURGE.
#
# Tears the stack down and DESTROYS all local state so `./init.sh` rebuilds from
# scratch: containers, named volumes, the MongoDB data directory (local ./data/mongo
# or the Pi USB bestflats_data/mongo), and the project images.
#
# The ONLY thing preserved is the root `.env` file (secrets/config) — that is all
# `./init.sh` needs to bring the platform back up.
#
# ⚠️  This deletes the database (bookings, users, listings). Back up first:
#       bash rental-platform/scripts/backup_mongo.sh
#     and restore later with:
#       bash rental-platform/scripts/restore_mongo.sh <archive.gz>
#
# Usage:
#   ./clean.sh            # interactive: asks for confirmation
#   CONFIRM=yes ./clean.sh  # non-interactive (cron / scripted)

set -e

echo "🧹 Cleaning up Rental Platform (FULL PURGE)..."

# 1. Prerequisites
command -v podman >/dev/null 2>&1 || { echo >&2 "❌ Podman is required but not installed. Aborting."; exit 1; }
command -v podman-compose >/dev/null 2>&1 || { echo >&2 "❌ podman-compose is required but not installed. Aborting."; exit 1; }

if [ ! -d "rental-platform" ]; then
    echo >&2 "❌ rental-platform directory not found. Run from the repo root."
    exit 1
fi

# 2. Resolve every candidate MongoDB data directory.
# The compose bind mount `${MONGO_DATA_DIR:-./data/mongo}` is relative to the
# rental-platform/ compose dir, so the DEFAULT location is rental-platform/data/mongo
# (a bind mount — `down -v` does NOT remove it; we must rm it explicitly). On the Pi
# the data may instead live on a USB mount. Collect all that apply and wipe each.
DATA_DIRS=()
# Honour an explicitly configured absolute MONGO_DATA_DIR (env or .env).
ENV_DATA_DIR="${MONGO_DATA_DIR:-$(grep -E '^MONGO_DATA_DIR=' .env 2>/dev/null | tail -1 | cut -d= -f2- || true)}"
[ -n "$ENV_DATA_DIR" ] && DATA_DIRS+=("$ENV_DATA_DIR")
# Compose default (the usual real location).
DATA_DIRS+=("rental-platform/data/mongo")
# Legacy/relative fallback.
DATA_DIRS+=("data/mongo")
# Pi USB location, if present.
ARCH=$(uname -m)
if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm"* ]]; then
    USB_ROOT=$(find /media/benyedde -name "bestflats_data" -type d -print -quit 2>/dev/null | sed 's|/bestflats_data||')
    [ -n "$USB_ROOT" ] && DATA_DIRS+=("$USB_ROOT/bestflats_data/mongo")
fi

# 3. Destructive confirmation (skipped when CONFIRM=yes).
echo
echo "This will PERMANENTLY DELETE:"
echo "  • all stack containers + named volumes (podman-compose down -v)"
echo "  • any of these MongoDB data dirs that exist:"
for d in "${DATA_DIRS[@]}"; do [ -d "$d" ] && echo "      - $d (EXISTS)" || echo "      - $d"; done
echo "  • the project images (backend / frontend / mcp-client)"
echo "It will KEEP: ./.env"
echo
if [ "${CONFIRM:-}" != "yes" ]; then
    read -r -p "Type 'yes' to proceed: " ANSWER
    [ "$ANSWER" = "yes" ] || { echo "Aborted — nothing was changed."; exit 1; }
fi

# 4. Stop and remove containers + named volumes.
echo "🛑 Stopping and removing containers + volumes..."
(cd rental-platform && podman-compose down -v) || true

# 5. Wipe every MongoDB data directory that exists.
for MONGO_DATA_DIR in "${DATA_DIRS[@]}"; do
    if [ -n "$MONGO_DATA_DIR" ] && [ -d "$MONGO_DATA_DIR" ]; then
        echo "💾 Removing MongoDB data dir: $MONGO_DATA_DIR"
        # Mongo runs as uid 999 inside the container, so files may be root/999-owned.
        podman unshare rm -rf "$MONGO_DATA_DIR" 2>/dev/null || sudo rm -rf "$MONGO_DATA_DIR" 2>/dev/null || rm -rf "$MONGO_DATA_DIR"
    fi
done

# 6. Remove the project images so init.sh rebuilds them fresh.
echo "🖼️  Removing project images..."
for img in $(podman images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep -E 'rental-platform_(backend|frontend|mcp-client)' || true); do
    echo "   - $img"
    podman rmi -f "$img" 2>/dev/null || true
done

echo "✅ Full purge complete. '.env' preserved. Run ./init.sh to rebuild."
