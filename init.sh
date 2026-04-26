#!/bin/bash
# init.sh - System Preparation & Mount Script

set -e

echo "🛑 Killing any existing containers..."
podman kill -a || true

echo "💾 Preparing external storage..."
# Ensure mount point exists
sudo mkdir -p /media/benyedde/rootfs

# Mount sda2
echo "Mounting /dev/sda2..."
sudo mount /dev/sda2 /media/benyedde/rootfs || echo "Info: /dev/sda2 already mounted or mount failed."

# Fix permissions
echo "Setting ownership and permissions..."
sudo chown -R $USER:$USER /media/benyedde/rootfs
sudo chmod -R 775 /media/benyedde/rootfs

# Cleanup temporary storage
echo "🧹 Cleaning up podman-storage tmp..."
rm -rf /media/benyedde/rootfs/podman-storage/tmp/
mkdir -p /media/benyedde/rootfs/podman-storage/tmp/

echo "✅ System prepared. Launching stack..."
./start.sh
