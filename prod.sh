#!/bin/bash
set -e

echo "🚀 Starting bestflats.vip PRODUCTION Deployment..."

# 1. Environment Setup — .env is the operator-managed source of truth.
# This script NEVER creates, edits or deletes it; it only requires it to exist.
# Configure NODE_ENV=production, secrets (AUTH_JWT_SECRET, MASTER_ENCRYPTION_KEY),
# FRONTEND_ORIGIN, NEXT_PUBLIC_BACKEND_URL, MONGO_URI, etc. in .env yourself.
if [ ! -f .env ]; then
    echo "❌ .env not found at repo root. Create it manually (see rental-platform/.env.example)." >&2
    echo "   This script will not generate or modify .env." >&2
    exit 1
fi
echo "✅ .env present — left untouched."

# Propagate the managed root .env to where podman-compose reads it (one-way copy FROM
# the source of truth; the root .env itself is never modified).
cp .env rental-platform/.env
# Compose receives private env through rental-platform/.env. Do not copy secrets into build contexts.

# 2. Cleanup and Build
echo "🧹 Cleaning up existing containers..."
./clean.sh > /dev/null 2>&1 || true

echo "🏗️  Building production images..."
# We use the existing podman-compose but ensure images are fresh
podman-compose -f rental-platform/podman-compose.yml build --no-cache

# 3. Launch
echo "🔌 Launching services..."
podman-compose -f rental-platform/podman-compose.yml up -d

echo -e "\n✨ PRODUCTION DEPLOYMENT COMPLETE!"
echo "--------------------------------------------------"
echo "🌍 Frontend: http://localhost:3000"
echo "⚙️  Backend:  http://localhost:4000"
echo "--------------------------------------------------"
echo "To view logs: podman-compose -f rental-platform/podman-compose.yml logs -f"
