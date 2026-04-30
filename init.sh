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
    
    # 1. Find the primary USB mount point
    USB_ROOT=$(find /media/benyedde -maxdepth 1 -mindepth 1 -type d | head -n 1)

    if [ -z "$USB_ROOT" ]; then
        echo "❌ Error: USB drive not found under /media/benyedde/"
        exit 1
    fi

    # 2. Cleanup any "ghost" or double mounts to avoid conflicts
    if mount | grep -q "/media/benyedde/rootfs"; then
        echo "🧹 Cleaning up duplicate rootfs mount..."
        sudo umount -l /media/benyedde/rootfs || true
    fi

    echo "✅ Using USB Mount: $USB_ROOT"

    # 3. Aggressively ensure execution is allowed
    sudo mount -o remount,rw,exec,dev,suid "$USB_ROOT" || true
    
    # 4. Fix permissions for the user
    sudo chown -R $USER:$USER "$USB_ROOT"
    
    # 5. Ensure data directory exists
    mkdir -p "$USB_ROOT/bestflats_data/mongo"
else
    # PC/Local logic
    echo "📂 Ensuring local data directories exist..."
    mkdir -p data/mongo
fi

echo "✅ System prepared. Launching stack..."
./start.sh
