#!/bin/bash
# setup-reboot.sh - Automated Startup for Linux Server/PC

set -e
cd "$(dirname "$0")"

echo "🔄 Starting Rental Platform Services..."

# 1. Basic environment check — .env is operator-managed and never created by scripts.
if [ ! -f .env ]; then
    echo "❌ No .env file found. Create it manually (see rental-platform/.env.example) and re-run." >&2
    exit 1
fi

# 2. Ensure Podman is responsive
if ! podman version >/dev/null 2>&1; then
    echo "❌ Podman service is not responding. Waiting..."
    sleep 5
fi

# 3. Start the stack
echo "🔌 Powering up services..."
cd rental-platform
podman-compose up -d

# 4. Final verification
echo "✅ Services initiated. Check status with 'podman-compose ps'"
