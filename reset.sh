#!/bin/bash

# Reset Script for Rental Platform — DATA-SAFE.
#
# Tears the stack down and removes the project images so `./init.sh` rebuilds
# everything fresh, but PRESERVES all persistent state:
#   • the MongoDB data directory (local ./data/mongo or the Pi USB bestflats_data/mongo)
#   • named volumes (podman-compose down WITHOUT -v)
#   • the root `.env` file
#
# Use this to force a clean rebuild of the containers/images after a code change
# without losing bookings, users or listings. For a full wipe, use ./clean.sh.
#
# Usage:
#   ./reset.sh

set -e

echo "♻️  Resetting Rental Platform (data-safe rebuild)..."

# 1. Prerequisites
command -v podman >/dev/null 2>&1 || { echo >&2 "❌ Podman is required but not installed. Aborting."; exit 1; }
command -v podman-compose >/dev/null 2>&1 || { echo >&2 "❌ podman-compose is required but not installed. Aborting."; exit 1; }

if [ ! -d "rental-platform" ]; then
    echo >&2 "❌ rental-platform directory not found. Run from the repo root."
    exit 1
fi

# 2. Stop and remove containers — KEEP named volumes (no -v) and the data dir.
echo "🛑 Stopping and removing containers (data + volumes preserved)..."
(cd rental-platform && podman-compose down) || true

# 3. Remove the project images so init.sh rebuilds them fresh.
echo "🖼️  Removing project images (data untouched)..."
for img in $(podman images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep -E 'rental-platform_(backend|frontend|mcp-client)' || true); do
    echo "   - $img"
    podman rmi -f "$img" 2>/dev/null || true
done

echo "✅ Reset complete. Database + .env preserved. Run ./init.sh to rebuild."
