#!/bin/bash
# deploy_pi_prod.sh - Specialized deployment for Raspberry Pi with Subdomains

set -e

echo "🏗️  Starting dreamflat Production Deployment for Pi..."

# 1. Environment Configuration
# We use the specific subdomains you requested
FRONTEND_DOMAIN="https://dreamflat.tree4five.com"
BACKEND_DOMAIN="https://api-dreamflat.tree4five.com"

echo "📍 Configuration:"
echo "   - Frontend: $FRONTEND_DOMAIN"
echo "   - Backend:  $BACKEND_DOMAIN"

# 2. Create optimized .env file
cat > .env <<EOF
# Production Settings
NODE_ENV=production
FRONTEND_ORIGIN=$FRONTEND_DOMAIN
NEXT_PUBLIC_BACKEND_URL=$BACKEND_DOMAIN
PORT=4000

# Security
AUTH_JWT_SECRET=$(openssl rand -base64 32)

# Database
MONGO_URI=mongodb://mongo:27017/rental-platform
EOF

# Copy .env to sub-packages
cp .env rental-platform/.env
cp .env rental-platform/frontend/.env

# 3. Clean up any existing instances
echo "🧹 Cleaning old containers..."
cd rental-platform
podman-compose down || true

# 4. Build and Start
echo "🚀 Building and starting the stack..."
podman-compose up --build -d

# 5. Wait and Seed
echo "⏳ Waiting for services to stabilize..."
sleep 10

echo "🌱 Seeding initial luxury inventory..."
curl -X POST "$BACKEND_DOMAIN/seed/unprotected?force=true" || \
curl -X POST "http://localhost:4000/seed/unprotected?force=true"

echo "
✅ DEPLOYMENT SUCCESSFUL!

Your application is now running locally on ports 3000 (UI) and 4000 (API).
Once your Cloudflare Tunnel is active, it will be reachable at:
🔗 $FRONTEND_DOMAIN
"
