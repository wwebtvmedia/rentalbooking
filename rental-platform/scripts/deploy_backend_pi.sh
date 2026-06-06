#!/usr/bin/env bash
set -euo pipefail

REPO_URL=${1:-}
APP_DIR=${2:-/home/pi/rental-platform}

# --- Prerequisites ---
echo "Installing prerequisites: git, curl, podman..."
sudo apt-get update
sudo apt-get install -y curl git build-essential ca-certificates podman podman-compose

# --- Application Setup ---
if [ -n "$REPO_URL" ]; then
  echo "Cloning repo from $REPO_URL to $APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "No REPO_URL provided — assuming repository already present at $APP_DIR"
fi

cd "$APP_DIR" || exit 1

# Environment file — .env is the operator-managed source of truth.
# This script NEVER creates, edits or deletes it (appending here previously clobbered
# a configured MONGO_URI and took the backend down). It only requires .env to exist,
# with MONGO_URI, AUTH_JWT_SECRET, MASTER_ENCRYPTION_KEY, FRONTEND_ORIGIN and
# NEXT_PUBLIC_BACKEND_URL already set correctly for this host.
echo "Checking .env ..."
if [ ! -f ".env" ]; then
  echo "ERROR: .env not found in $APP_DIR. Create it manually (see rental-platform/.env.example)" >&2
  echo "       before running this deploy. This script will not generate or modify .env." >&2
  exit 1
fi
echo ".env present — left untouched."

# --- Deployment ---
echo "Building and starting services with Podman Compose..."
# Use the renamed podman-compose.yml
podman-compose -f rental-platform/podman-compose.yml build
podman-compose -f rental-platform/podman-compose.yml up -d

cat <<EOF

Deployment complete.
- Application directory: $APP_DIR
- Environment file: $APP_DIR/.env
- All services are running in Podman containers.
- Check status with: podman-compose -f rental-platform/podman-compose.yml ps

Services:
- Frontend: http://localhost:3000
- Backend:  http://localhost:4000
- MongoDB:  Port 27017

EOF
