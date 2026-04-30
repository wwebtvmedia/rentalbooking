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
    # Ensure mount point exists
    sudo mkdir -p /media/benyedde/rootfs

    # Mount sda2 and ensure execution is allowed
    echo "Mounting /dev/sda2 with exec permissions..."
    sudo mount /dev/sda2 /media/benyedde/rootfs || true
    sudo mount -o remount,exec /media/benyedde/rootfs || true

    # Fix permissions
    echo "Setting ownership and permissions..."
    sudo chown -R $USER:$USER /media/benyedde/rootfs
    sudo chmod -R u+rwX,go-rwx /media/benyedde/rootfs

    # Ensure directories exist
    mkdir -p /media/benyedde/rootfs/podman-storage/tmp/
    mkdir -p /media/benyedde/rootfs/bestflats_data/mongo
else
    # PC/Local logic
    echo "📂 Ensuring local data directories exist..."
    mkdir -p data/mongo
fi

echo "✅ System prepared. Launching stack..."
./start.sh
