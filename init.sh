#!/bin/bash
set -e

# --- Configuration ---
NODE_VERSION="20"
MIN_RAM_GB=4

# --- Functions ---
error_exit() {
    echo -e "\033[0;31mError: $1\033[0m" >&2
    exit 1
}

check_requirement() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "\033[0;33mWarning: $1 is not installed.\033[0m"
        return 1
    fi
    return 0
}

# --- System Check ---
echo "🧐 Checking system compatibility..."

# Check RAM (Next.js build requires significant memory)
TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
if [ "$TOTAL_RAM" -lt "$MIN_RAM_GB" ]; then
    echo -e "\033[0;33mWarning: You have ${TOTAL_RAM}GB RAM. $MIN_RAM_GB GB is recommended for Next.js builds.\033[0m"
    echo "         On Raspberry Pi, ensure you have a swap file enabled."
fi

# Detect Architecture
ARCH=$(uname -m)
echo "Platform: $(uname -s) ($ARCH)"

if [[ "$ARCH" == "armv7l" ]]; then
    echo -e "\033[0;33mWarning: ARMv7 (32-bit) detected. MongoDB 7+ and some Node packages may require 64-bit (AARCH64).\033[0m"
fi

# --- Install Dependencies ---
echo -e "\n📦 Installing project dependencies..."

# Backend
echo "🔹 Setting up Backend..."
cd rental-platform/backend
npm install
cd ../..

# Frontend
echo "🔹 Setting up Frontend..."
cd rental-platform/frontend
npm install
cd ../..

# MCP Client (Python)
echo "🔹 Setting up MCP Client..."
if check_requirement python3; then
    cd rental-platform/mcp-client
    python3 -m venv venv || echo "Could not create venv, skipping..."
    source venv/bin/activate 2>/dev/null || true
    pip install -r requirements.txt || echo "Pip install failed, ensure you have python3-pip installed."
    cd ../..
fi

# --- Environment Setup ---
echo -e "\n⚙️  Setting up environment..."
if [ ! -f .env ]; then
    if [ -f rental-platform/.env.example ]; then
        cp rental-platform/.env.example .env
        echo "✅ Created .env from example."
        # Generate a random secret if openssl is available
        if command -v openssl &> /dev/null; then
            SECRET=$(openssl rand -base64 32)
            sed -i "s/AUTH_JWT_SECRET=.*/AUTH_JWT_SECRET=$SECRET/" .env
        fi
    else
        echo "AUTH_JWT_SECRET=$(date | md5sum | head -c 32)" > .env
        echo "MONGO_URI=mongodb://localhost:27017/rental" >> .env
        echo "✅ Created basic .env file."
    fi
fi

echo -e "\n✨ Initialization complete!"
echo "--------------------------------------------------"
echo "🚀 To start the platform, run: ./start.sh"
echo "🧪 To run tests, run:         ./test.sh"
echo "--------------------------------------------------"

if [[ "$ARCH" == "aarch64" || "$ARCH" == "x86_64" ]]; then
    echo "✅ Your system ($ARCH) is fully compatible with the containerized stack."
else
    echo "⚠️  Note: For Raspberry Pi, we recommend using a 64-bit OS (Raspberry Pi OS 64-bit)."
fi
