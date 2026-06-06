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

# 2. Resolve the MongoDB data directory (Pi USB vs local), mirroring start.sh.
ARCH=$(uname -m)
if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm"* ]]; then
    USB_ROOT=$(find /media/benyedde -name "bestflats_data" -type d -print -quit 2>/dev/null | sed 's|/bestflats_data||')
    if [ -z "$USB_ROOT" ]; then
        USB_ROOT=$(find /media/benyedde -maxdepth 1 -mindepth 1 -type d ! -name "rootfs" | head -n 1)
    fi
    [ -n "$USB_ROOT" ] && MONGO_DATA_DIR="$USB_ROOT/bestflats_data/mongo" || MONGO_DATA_DIR="./data/mongo"
else
    MONGO_DATA_DIR="./data/mongo"
fi

# 3. Destructive confirmation (skipped when CONFIRM=yes).
echo
echo "This will PERMANENTLY DELETE:"
echo "  • all stack containers + named volumes (podman-compose down -v)"
echo "  • the MongoDB data dir: $MONGO_DATA_DIR"
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

# 5. Wipe the MongoDB data directory.
if [ -n "$MONGO_DATA_DIR" ] && [ -d "$MONGO_DATA_DIR" ]; then
    echo "💾 Removing MongoDB data dir: $MONGO_DATA_DIR"
    # Mongo runs as uid 999 inside the container, so files may be root/999-owned.
    podman unshare rm -rf "$MONGO_DATA_DIR" 2>/dev/null || sudo rm -rf "$MONGO_DATA_DIR" 2>/dev/null || rm -rf "$MONGO_DATA_DIR"
fi

# 6. Remove the project images so init.sh rebuilds them fresh.
echo "🖼️  Removing project images..."
for img in $(podman images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep -E 'rental-platform_(backend|frontend|mcp-client)' || true); do
    echo "   - $img"
    podman rmi -f "$img" 2>/dev/null || true
done

echo "✅ Full purge complete. '.env' preserved. Run ./init.sh to rebuild."
