#!/bin/bash
# check_logs.sh - Monitor email and auth logs in real-time

echo "🔍 Monitoring Auth & Email logs (Ctrl+C to stop)..."
echo "--------------------------------------------------"

# Filter for relevant keywords to keep it clean
podman logs -f backend | grep -iE "MAIL|AUTH|MAGIC|ERROR"
