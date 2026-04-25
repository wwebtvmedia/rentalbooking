#!/bin/bash
# finish_cloudflare.sh - Finish setup after manual cert placement

set -e

if [ ! -f ~/.cloudflared/cert.pem ]; then
    echo "❌ Error: cert.pem not found in ~/.cloudflared/"
    echo "Please place the downloaded certificate there first."
    exit 1
fi

TUNNEL_NAME="bestflats.vip-pi"
echo "🏗️  Creating tunnel: $TUNNEL_NAME..."
cloudflared tunnel delete -f "$TUNNEL_NAME" 2>/dev/null || true
cloudflared tunnel create "$TUNNEL_NAME"

TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
echo "✅ Tunnel created with ID: $TUNNEL_ID"

echo "📝 Configuring tunnel routing..."
cat > ~/.cloudflared/config.yml <<EOF
tunnel: $TUNNEL_ID
credentials-file: /home/$USER/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: bestflats.vip
    service: http://localhost:3000
  - hostname: api-bestflats.vip
    service: http://localhost:4000
  - service: http_status:404
EOF

echo "🌐 Routing subdomains to tunnel..."
cloudflared tunnel route dns "$TUNNEL_NAME" bestflats.vip
cloudflared tunnel route dns "$TUNNEL_NAME" api-bestflats.vip

echo "🚀 Installing/Restarting as systemd service..."
sudo cloudflared service install 2>/dev/null || true
sudo systemctl enable cloudflared
sudo systemctl restart cloudflared

echo "✨ DONE! Check status with: sudo systemctl status cloudflared"
