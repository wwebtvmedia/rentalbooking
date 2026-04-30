#!/bin/bash
# init.sh - System Preparation & Mount Script

set -e

# System Detection
ARCH=$(uname -m)
IS_PI=false
if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm"* ]]; then
    IS_PI=true
    echo "🔍 Raspberry Pi (ARM) detected."
else
    echo "💻 PC/Server ($ARCH) detected. Skipping hardware-specific mounts."
fi

echo "🛑 Stopping this project stack if it is already running..."
if [ -d "rental-platform" ]; then (cd rental-platform && podman-compose down) || true; fi

if [ "$IS_PI" = true ]; then
    echo "💾 Preparing external storage for Raspberry Pi..."
    
    # 1. Find the best mount point (Prioritize 'rootfs' because Podman uses it)
    if mount | grep -q "/media/benyedde/rootfs"; then
        USB_ROOT="/media/benyedde/rootfs"
    else
        USB_ROOT=$(find /media/benyedde -maxdepth 1 -mindepth 1 -type d | head -n 1)
    fi

    if [ -z "$USB_ROOT" ]; then
        echo "❌ Error: No USB drive found under /media/benyedde/"
        exit 1
    fi

    echo "✅ Using USB Mount: $USB_ROOT"

    # 2. Aggressively ensure execution is allowed
    # We use quotes to handle names like "New Volume"
    sudo mount -o remount,rw,exec,dev,suid "$USB_ROOT" || true
    
    # 3. Fix permissions for the data directory
    # We use sudo for the mkdir to ensure it works even if Podman is cranky
    sudo mkdir -p "$USB_ROOT/bestflats_data/mongo"
    sudo chown -R $USER:$USER "$USB_ROOT/bestflats_data"
else
    # PC/Local logic
    echo "📂 Ensuring local data directories exist..."
    mkdir -p data/mongo
fi

echo "✅ System prepared. Launching stack..."
./start.sh
