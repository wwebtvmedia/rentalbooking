#!/bin/bash
set -e

echo "🚀 Starting Rental Platform in PRODUCTION mode..."

# 1. Environment Setup
if [ ! -f .env ]; then
    echo "⚠️  .env file missing. Creating from example..."
    cp rental-platform/.env.example .env
fi

# Ensure NODE_ENV is set to production in .env
if grep -q "NODE_ENV=" .env; then
    sed -i 's/NODE_ENV=.*/NODE_ENV=production/' .env
else
    echo "NODE_ENV=production" >> .env
fi

# Ensure secrets are secure
if grep -q "AUTH_JWT_SECRET=your-secret-key-change-me" .env; then
    echo "🔐 Generating secure AUTH_JWT_SECRET..."
    SECRET=$(openssl rand -base64 32)
    sed -i "s/AUTH_JWT_SECRET=.*/AUTH_JWT_SECRET=$SECRET/" .env
fi

# 1b. Public Domain Configuration (Cloudflare Support)
echo "🌐 Configuring Public Domains..."
# Check if domains are already set, otherwise prompt or use localhost as fallback
if ! grep -q "FRONTEND_ORIGIN=http" .env || grep -q "localhost:3000" .env; then
    read -p "Enter your public frontend domain (e.g., https://rent.example.com) [leave empty for localhost]: " PUB_FE
    if [ -n "$PUB_FE" ]; then
        sed -i "s|FRONTEND_ORIGIN=.*|FRONTEND_ORIGIN=$PUB_FE|" .env
    fi
fi

if ! grep -q "NEXT_PUBLIC_BACKEND_URL=http" .env || grep -q "localhost:4000" .env; then
    read -p "Enter your public backend domain (e.g., https://api.example.com) [leave empty for localhost]: " PUB_BE
    if [ -n "$PUB_BE" ]; then
        sed -i "s|NEXT_PUBLIC_BACKEND_URL=.*|NEXT_PUBLIC_BACKEND_URL=$PUB_BE|" .env
    fi
fi

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
