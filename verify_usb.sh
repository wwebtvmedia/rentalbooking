#!/bin/bash
# verify_usb.sh - Diagnostic script for Raspberry Pi USB Storage

echo "🔍 Running USB Storage Diagnosis..."

# 1. Check for physical USB devices
echo "--- 1. Physical Disks (lsblk) ---"
lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINT,LABEL

# 2. Check for mounts in /media
echo -e "\n--- 2. Active Mounts in /media ---"
findmnt -l | grep "/media" || echo "No active mounts found in /media"

# 3. Specifically look for the bestflats_data directory
echo -e "\n--- 3. Searching for Project Data Root ---"
USB_ROOT=$(find /media -name "bestflats_data" -type d -print -quit 2>/dev/null | sed 's|/bestflats_data||')

if [ -n "$USB_ROOT" ]; then
    echo "✅ SUCCESS: Found data root at: $USB_ROOT"
    echo "📁 Data Directory: $USB_ROOT/bestflats_data"
    echo "📊 Disk Space on $USB_ROOT:"
    df -h "$USB_ROOT" | tail -n 1
else
    echo "❌ FAILURE: 'bestflats_data' directory not found."
    echo "💡 Tip: Ensure your USB is formatted (ext4 recommended) and mounted."
    echo "💡 Tip: If you just plugged it in, try: sudo mount -a"
fi

# 4. Check for the specific 'benyedde' user path used in init.sh
if [ ! -d "/media/benyedde" ]; then
    echo -e "\n⚠️  WARNING: /media/benyedde directory does not exist."
    echo "   The deployment script expects the mount to be under this user path."
fi
