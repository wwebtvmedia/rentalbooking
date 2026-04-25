#!/bin/bash
# setup_cloudflare.sh - Install and configure Cloudflare Tunnel as a system service

set -e

echo "☁️  Setting up Cloudflare Tunnel for Raspberry Pi..."

# 1. Install cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "📦 Installing cloudflared..."
    # Detect architecture
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then
        FILE="cloudflared-linux-amd64.deb"
    elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
        FILE="cloudflared-linux-arm64.deb"
    else
        FILE="cloudflared-linux-arm.deb"
    fi
    
    wget -q "https://github.com/cloudflare/cloudflared/releases/latest/download/$FILE"
    sudo dpkg -i "$FILE"
    rm "$FILE"
else
    echo "✅ cloudflared is already installed."
fi

# 2. Authentication
echo "🔑 Please log in to Cloudflare..."
echo "A browser window should open. If not, copy the link provided below."
cloudflared tunnel login

# 3. Create Tunnel
TUNNEL_NAME="dreamflat-pi"
echo "🏗️  Creating tunnel: $TUNNEL_NAME..."
# Delete existing tunnel with same name if it exists to avoid conflicts
cloudflared tunnel delete -f "$TUNNEL_NAME" 2>/dev/null || true
cloudflared tunnel create "$TUNNEL_NAME"

# Get Tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
echo "✅ Tunnel created with ID: $TUNNEL_ID"

# 4. Configuration
echo "📝 Configuring tunnel routing..."
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml <<EOF
tunnel: $TUNNEL_ID
credentials-file: /home/$USER/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: dreamflat.tree4five.com
    service: http://localhost:3000
  - hostname: api-dreamflat.tree4five.com
    service: http://localhost:4000
  - service: http_status:404
EOF

# 5. Route DNS
echo "🌐 Routing subdomains to tunnel..."
cloudflared tunnel route dns "$TUNNEL_NAME" dreamflat.tree4five.com
cloudflared tunnel route dns "$TUNNEL_NAME" api-dreamflat.tree4five.com

# 6. Install as Service
echo "🚀 Installing as systemd service..."
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

echo "
✨ CLOUDFLARE SETUP COMPLETE!
Your tunnel is now running as a background service.

Check status with:
sudo systemctl status cloudflared

Your site should soon be live at:
🔗 https://dreamflat.tree4five.com
🔗 https://api-dreamflat.tree4five.com
"
