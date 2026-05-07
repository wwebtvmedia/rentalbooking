#!/bin/bash
# check_pi_health.sh - Diagnose 502 errors and system health on Raspberry Pi

echo "📊 Checking Raspberry Pi System Health..."

# 1. Check for CPU Throttling (Voltage/Temp issues)
echo "--- 1. Throttling & Temp ---"
if command -v vcgencmd &> /dev/null; then
    vcgencmd get_throttled
    vcgencmd measure_temp
else
    echo "vcgencmd not found (might be running in a container or non-Pi OS)"
fi

# 2. Check Resource Usage
echo -e "\n--- 2. Resource Usage ---"
uptime
free -h

# 3. Check Container Status & Restarts
echo -e "\n--- 3. Container Status ---"
podman ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Restarts}}"

# 4. Check for OOM Kills in Kernel
echo -e "\n--- 4. Kernel Errors (OOM/Disk) ---"
dmesg | grep -iE "out of memory|oom-kill|error|abort" | tail -n 10

# 5. Check Recent Frontend/Backend Errors
echo -e "\n--- 5. Recent Frontend Logs (Last 20 lines) ---"
podman logs --tail 20 frontend

echo -e "\n--- 6. Recent Backend Logs (Last 20 lines) ---"
podman logs --tail 20 backend

# 6. Test Local Connectivity (Is it actually listening?)
echo -e "\n--- 7. Local Port Check ---"
echo "Testing Frontend (3000):"
curl -I -s http://localhost:3000 | grep "HTTP" || echo "FAILED to reach port 3000"

echo "Testing Backend (4000):"
curl -I -s http://localhost:4000/apartments | grep "HTTP" || echo "FAILED to reach port 4000"
