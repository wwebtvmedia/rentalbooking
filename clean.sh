#!/bin/bash

# Clean Script for Rental Platform
# This script stops and removes the stack using Podman Compose.

set -e

echo "🧹 Cleaning up Rental Platform..."

# 1. Check for Prerequisites
command -v podman >/dev/null 2>&1 || { echo >&2 "❌ Podman is required but not installed. Aborting."; exit 1; }
command -v podman-compose >/dev/null 2>&1 || { echo >&2 "❌ podman-compose is required but not installed. Aborting."; exit 1; }

# 2. Stop and Remove the Stack
if [ -d "rental-platform" ]; then
    echo "🛑 Stopping and removing containers..."
    (cd rental-platform && podman-compose down)
    echo "✅ Stack cleaned up successfully."
else
    echo "❌ rental-platform directory not found. Are you in the root of the project?"
    exit 1
fi
