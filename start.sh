#!/bin/bash

# Unified Start Script for Rental Platform
# This script prepares the environment and starts the stack using Podman Compose.

set -e

echo "🚀 Starting Rental Platform Deployment..."

# 1. Check for Prerequisites
command -v podman >/dev/null 2>&1 || { echo >&2 "❌ Podman is required but not installed. Aborting."; exit 1; }
command -v podman-compose >/dev/null 2>&1 || { echo >&2 "❌ podman-compose is required but not installed. Aborting."; exit 1; }

# 2. Setup Environment Variables
if [ ! -f .env ]; then
    echo "📄 Creating .env from .env.example..."
    cp rental-platform/.env.example .env
    # Generate a random secret for JWT
    RANDOM_SECRET=$(openssl rand -base64 32)
    sed -i "s/change-me-to-a-secure-random-value/$RANDOM_SECRET/g" .env
    echo "✅ .env created with a fresh AUTH_JWT_SECRET."
else
    echo "✅ .env file already exists."
fi

# 3. Pull and Build
echo "🏗️  Building containers..."
podman-compose -f rental-platform/podman-compose.yml build

# 4. Start the Stack
echo "🔌 Starting services (Backend, Frontend, MongoDB, MCP Client)..."
podman-compose -f rental-platform/podman-compose.yml up -d

# 5. Wait for Backend and Seed Database
echo "⏳ Waiting for backend to be ready..."
until $(curl --output /dev/null --silent --head --fail http://localhost:4000/calendar/events); do
    printf '.'
    sleep 2
done

echo -e "\n🌱 Seeding database with initial apartments..."
curl -X POST http://localhost:4000/seed?force=true

echo "
✨ DEPLOYMENT COMPLETE! ✨

--------------------------------------------------
🖥️  Frontend: http://localhost:3000
⚙️  Backend:  http://localhost:4000
🤖 MCP SSE:  http://localhost:4000/mcp
--------------------------------------------------

To view logs, run:
podman-compose -f rental-platform/podman-compose.yml logs -f
"
