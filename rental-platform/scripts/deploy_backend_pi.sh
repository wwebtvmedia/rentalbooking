#!/usr/bin/env bash
set -euo pipefail

REPO_URL=${1:-}
APP_DIR=${2:-/home/pi/rental-backend}
MONGO_IMAGE=${MONGO_IMAGE:-mongo:6.0}

if [ -n "$REPO_URL" ]; then
  echo "Cloning repo from $REPO_URL to $APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "No REPO_URL provided — assuming repository already present at $APP_DIR"
fi

sudo apt-get update
sudo apt-get install -y curl git build-essential ca-certificates

# Install Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo "Docker installed. You may need to re-login for docker group to apply."
fi

# Start MongoDB in Docker (ARM-compatible official images are used)
if ! docker ps -a --format '{{.Names}}' | grep -q '^mongo$'; then
  docker run -d --name mongo --restart unless-stopped -p 27017:27017 -v /var/lib/mongo-data:/data/db "$MONGO_IMAGE"
  echo "MongoDB container started"
else
  echo "MongoDB container already exists"
fi

# Create environment file
mkdir -p "$APP_DIR"
cat > "$APP_DIR/.env" <<EOF
MONGO_URI=mongodb://localhost:27017/rental-platform
PORT=4000
AUTH_JWT_SECRET=$(openssl rand -base64 32)
FRONTEND_ORIGIN=http://localhost:3000
EOF

# Install and start backend
cd "$APP_DIR" || exit 1
npm ci --legacy-peer-deps

# Install pm2 process manager
sudo npm install -g pm2
pm2 start npm --name "rental-backend" -- start
pm2 save
pm2 startup systemd -u "$USER" --hp "$HOME" || true

cat <<EOF
Backend setup complete.
- Backend directory: $APP_DIR
- Env file: $APP_DIR/.env
- MongoDB running in Docker on port 27017
- Process manager: pm2 (service registered). Check with: pm2 status

If the Raspberry Pi will serve only the backend, ensure the machine is reachable from the frontend and that firewall/NAT rules allow incoming connections on port 4000.
EOF
