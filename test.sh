#!/bin/bash
set -e

echo "🧪 Running Backend Non-Regression Tests..."
cd rental-platform/backend
NODE_OPTIONS="--experimental-vm-modules" npm test

echo -e "\n🧪 Running Frontend E2E Tests..."
cd ../frontend
PORT=3000 npx playwright test

echo -e "\n✅ All tests passed successfully!"
