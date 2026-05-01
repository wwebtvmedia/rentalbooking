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

# --- CRITICAL: Fix Raspberry Pi Storage FIRST (so Podman can run) ---
if [ "$IS_PI" = true ]; then
    echo "💾 Preparing Raspberry Pi Storage..."
    
    # Identify all mount points under /media/benyedde/
    # We use -l to get a flat list and avoid any weird characters
    IFS=$'\n'
    for MNT in $(findmnt -l -n -o TARGET | grep "/media/benyedde"); do
        if [ -d "$MNT" ]; then
            echo "🔓 Fixing permissions on $MNT..."
            sudo mount -o remount,rw,exec,dev,suid "$MNT" 2>/dev/null || true
            sudo chown $USER:$USER "$MNT" 2>/dev/null || true
        fi
    done
    unset IFS

    # Specifically ensure Podman storage root exists if it's on a mount
    # Based on error: /media/benyedde/rootfs/podman-storage
    PODMAN_EXTRA_STORAGE="/media/benyedde/rootfs/podman-storage"
    if [ -d "/media/benyedde/rootfs" ]; then
        echo "📦 Ensuring Podman storage directory exists..."
        sudo mkdir -p "$PODMAN_EXTRA_STORAGE"
        sudo chown -R $USER:$USER "$PODMAN_EXTRA_STORAGE"
    fi

    # Find the specific root for our data
    USB_ROOT=$(find /media/benyedde -name "bestflats_data" -type d -print -quit 2>/dev/null | sed 's|/bestflats_data||')
    if [ -z "$USB_ROOT" ]; then
        # Fallback to the first available directory that isn't rootfs if possible
        USB_ROOT=$(find /media/benyedde -maxdepth 1 -mindepth 1 -type d ! -name "rootfs" | head -n 1)
    fi
    
    if [ -n "$USB_ROOT" ]; then
        echo "✅ Using data root: $USB_ROOT"
        mkdir -p "$USB_ROOT/bestflats_data/mongo"
    fi
fi

echo "🛑 Stopping this project stack if it is already running..."
if [ -d "rental-platform" ]; then
    (cd rental-platform && podman-compose down) || true
fi

# PC/Local logic fallback
if [ "$IS_PI" = false ]; then
    echo "📂 Ensuring local data directories exist..."
    mkdir -p data/mongo
fi

echo "✅ System prepared. Launching stack..."
chmod +x ./start.sh
./start.sh
