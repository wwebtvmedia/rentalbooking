#!/bin/bash

# Unified Start Script for Rental Platform
# This script prepares the environment and starts the stack using Podman Compose.

set -e

# --- ARCHITECTURE & STORAGE OPTIMIZATION ---
ARCH=$(uname -m)
if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm"* ]]; then
    echo "🔍 Raspberry Pi (ARM) detected. Applying storage optimizations."
    # Use the USB disk for temporary build files and data
    USB_ROOT="/media/benyedde/rootfs"
    if [ -d "$USB_ROOT" ]; then
        mkdir -p "$USB_ROOT/tmp"
        export TMPDIR="$USB_ROOT/tmp"
        export PODMAN_TMPDIR="$USB_ROOT/tmp"
        export MONGO_DATA_DIR="$USB_ROOT/bestflats_data/mongo"
        echo "💾 Using USB Disk for storage and temporary build files."
    fi
else
    echo "💻 PC/Server ($ARCH) detected. Using local storage."
    export MONGO_DATA_DIR="./data/mongo"
    mkdir -p "$MONGO_DATA_DIR"
fi

# 1. Check for Prerequisites
command -v podman >/dev/null 2>&1 || { echo >&2 "❌ Podman is required but not installed. Aborting."; exit 1; }
command -v podman-compose >/dev/null 2>&1 || { echo >&2 "❌ podman-compose is required but not installed. Aborting."; exit 1; }

# 2. Setup Environment Variables
if [ ! -f .env ]; then
    echo "📄 Creating .env from .env.example..."
    cp rental-platform/.env.example .env
    
    # Generate random secrets
    RANDOM_JWT=$(openssl rand -base64 32)
    RANDOM_MASTER=$(openssl rand -base64 32)
    RANDOM_ADMIN=$(openssl rand -base64 32)
    
    # Use | as delimiter to avoid issues with / in base64
    sed -i "s|AUTH_JWT_SECRET=change-me-to-a-secure-random-value|AUTH_JWT_SECRET=$RANDOM_JWT|g" .env
    sed -i "s|MASTER_ENCRYPTION_KEY=change-me-to-a-secure-random-value|MASTER_ENCRYPTION_KEY=$RANDOM_MASTER|g" .env
    sed -i "s|PLATFORM_ADMIN_KEY=change-me-to-a-secure-random-value|PLATFORM_ADMIN_KEY=$RANDOM_ADMIN|g" .env
    sed -i "s|NEXT_PUBLIC_PLATFORM_ADMIN_KEY=change-me-to-a-secure-random-value|NEXT_PUBLIC_PLATFORM_ADMIN_KEY=$RANDOM_ADMIN|g" .env
    
    echo "✅ .env created with fresh secrets."
else
    echo "✅ .env file already exists."
fi

# Load brand name for script messages
BRAND_NAME=$(grep NEXT_PUBLIC_BRAND_NAME .env | cut -d '=' -f2 || echo "bestflats.vip")
echo "🚀 Starting $BRAND_NAME Deployment..."

# Ensure .env is available in the rental-platform directory for podman-compose
cp .env rental-platform/.env
cp .env rental-platform/frontend/.env

# 3. Build and Start
echo "🏗️  Building and starting services..."
(cd rental-platform && podman-compose build && podman-compose up -d)

# 4. Final verification steps... (renumbering)

# 5. Wait for Backend and Seed Database
echo "⏳ Waiting for backend to be ready..."
until $(curl --output /dev/null --silent --head --fail http://localhost:4000/calendar/events); do
    printf '.'
    sleep 2
done

echo -e "\n🌱 Seeding database with initial apartments..."
# Load admin key from .env
ADMIN_KEY=$(grep PLATFORM_ADMIN_KEY .env | cut -d '=' -f2)
curl -X GET -H "x-platform-admin-key: $ADMIN_KEY" "http://localhost:4000/seed/unprotected?force=true"

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
