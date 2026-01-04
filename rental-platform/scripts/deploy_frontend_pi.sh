#!/usr/bin/env bash
set -euo pipefail

REPO_URL=${1:-}
APP_DIR=${2:-/home/pi/rental-frontend}
BACKEND_URL=${3:-}

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

# Determine backend url
if [ -z "$BACKEND_URL" ]; then
  read -rp "Enter backend URL (e.g. http://192.168.1.10:4000): " BACKEND_URL
fi

mkdir -p "$APP_DIR"
cat > "$APP_DIR/.env.local" <<EOF
NEXT_PUBLIC_BACKEND_URL=$BACKEND_URL
PORT=3000
EOF

cd "$APP_DIR/frontend" || exit 1
npm ci --legacy-peer-deps
npm run build

# Install pm2 to manage the Next.js process
sudo npm install -g pm2
pm2 start "npx" --name "rental-frontend" -- start -- -p 3000
pm2 save
pm2 startup systemd -u "$USER" --hp "$HOME" || true

# Optional: install nginx and configure reverse proxy
if ! command -v nginx >/dev/null 2>&1; then
  sudo apt-get install -y nginx
  sudo tee /etc/nginx/sites-available/rental-frontend >/dev/null <<NGINX
server {
  listen 80;
  server_name _;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
NGINX
  sudo ln -fs /etc/nginx/sites-available/rental-frontend /etc/nginx/sites-enabled/rental-frontend
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo systemctl restart nginx
  echo "Nginx reverse proxy installed and configured (port 80 -> 3000)"
fi

cat <<EOF
Frontend setup complete.
- Frontend directory: $APP_DIR/frontend
- Env file: $APP_DIR/.env.local
- Frontend served on port 3000 (optionally proxied by nginx to port 80)
- Process manager: pm2 (check with: pm2 status)

EOF
