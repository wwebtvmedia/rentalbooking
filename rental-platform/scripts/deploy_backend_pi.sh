#!/usr/bin/env bash
set -euo pipefail

REPO_URL=${1:-}
APP_DIR=${2:-/home/pi/rental-platform}

# --- Prerequisites ---
echo "Installing prerequisites: git, curl, docker..."
sudo apt-get update
sudo apt-get install -y curl git build-essential ca-certificates

# Install Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo "Docker installed. You may need to re-login for the docker group to apply."
fi

# Install Docker Compose
if ! command -v docker-compose >/dev/null 2>&1; then
  echo "Installing Docker Compose..."
  sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
fi

# --- Application Setup ---
if [ -n "$REPO_URL" ]; then
  echo "Cloning repo from $REPO_URL to $APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "No REPO_URL provided — assuming repository already present at $APP_DIR"
fi

cd "$APP_DIR" || exit 1

# Create environment file from example
echo "Creating .env file..."
if [ -f ".env.example" ]; then
  cp .env.example .env
else
  echo "Warning: .env.example not found. Creating a default .env file."
fi

# Update .env with secure and correct values
# Note: For a real deployment, these origins/URLs should point to the public IPs or domains.
echo "MONGO_URI=mongodb://mongo:27017/rental-platform" >> .env
echo "PORT=4000" >> .env
echo "AUTH_JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "FRONTEND_ORIGIN=http://localhost:3000" >> .env
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:4000" >> .env

# --- Deployment ---
echo "Building and starting services with Docker Compose..."
docker-compose build
docker-compose up -d

cat <<EOF

Deployment complete.
- Application directory: $APP_DIR
- Environment file: $APP_DIR/.env
- All services are running in Docker containers.
- Check status with: docker-compose ps

Services:
- Frontend: http://localhost:3000
- Backend:  http://localhost:4000
- MongoDB:  Port 27017

EOF
