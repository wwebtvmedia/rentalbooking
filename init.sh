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
    # We loop through them and ensure they are all executable and owned by the user
    IFS=$'\n'
    for MNT in $(findmnt -n -o TARGET | grep "/media/benyedde"); do
        echo "🔓 Fixing permissions on $MNT..."
        sudo mount -o remount,rw,exec,dev,suid "$MNT" || true
        sudo chown -R $USER:$USER "$MNT" || true
    done
    unset IFS

    # Find the specific root for our data
    USB_ROOT=$(find /media/benyedde -name "bestflats_data" -type d -print -quit | sed 's|/bestflats_data||')
    if [ -z "$USB_ROOT" ]; then
        # Fallback to the first available directory if folder not found yet
        USB_ROOT=$(find /media/benyedde -maxdepth 1 -mindepth 1 -type d | head -n 1)
    fi
    echo "✅ Using data root: $USB_ROOT"
    mkdir -p "$USB_ROOT/bestflats_data/mongo"
fi

echo "🛑 Stopping this project stack if it is already running..."
if [ -d "rental-platform" ]; then (cd rental-platform && podman-compose down) || true; fi

    # PC/Local logic
    echo "📂 Ensuring local data directories exist..."
    mkdir -p data/mongo
fi

echo "✅ System prepared. Launching stack..."
./start.sh
