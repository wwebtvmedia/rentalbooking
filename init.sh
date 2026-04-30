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
    # Auto-detect USB mount point
    USB_ROOT=$(find /media/benyedde -maxdepth 1 -mindepth 1 -type d | head -n 1)

    if [ -z "$USB_ROOT" ]; then
        echo "❌ Error: USB drive not found under /media/benyedde/"
        exit 1
    fi

    echo "✅ Found USB Mount: $USB_ROOT"

    # Ensure execution is allowed
    echo "🔓 Ensuring exec permissions..."
    sudo mount -o remount,exec "$USB_ROOT" || true

    # Fix permissions
    echo "Setting ownership..."
    sudo chown -R $USER:$USER "$USB_ROOT"
    
    # Ensure directories exist
    mkdir -p "$USB_ROOT/podman-storage/tmp/"
    mkdir -p "$USB_ROOT/bestflats_data/mongo"
else
    # PC/Local logic
    echo "📂 Ensuring local data directories exist..."
    mkdir -p data/mongo
fi

echo "✅ System prepared. Launching stack..."
./start.sh
