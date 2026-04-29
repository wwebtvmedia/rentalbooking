#!/bin/bash
set -e

echo "🧪 Running Backend Non-Regression Tests..."
cd rental-platform/backend
NODE_OPTIONS="--experimental-vm-modules" npm test

echo -e "\n🧪 Starting Backend in Background for Frontend E2E Tests..."
# Start backend on port 5001 for testing
export PLATFORM_ADMIN_KEY="test-admin-key"
export AUTH_JWT_SECRET="test-secret"
export MASTER_ENCRYPTION_KEY="test-master-key-12345678901234567890"
PORT=5001 NODE_ENV=test node src/index.js > /tmp/backend-test.log 2>&1 &
BACKEND_PID=$!

# Wait for backend
echo "⏳ Waiting for backend..."
until $(curl --output /dev/null --silent --head --fail http://localhost:5001/calendar/events); do
    printf '.'
    sleep 1
done
echo -e "\n✅ Backend ready."

echo "🌱 Seeding database for E2E tests..."
curl -X GET -H "x-platform-admin-key: test-admin-key" "http://localhost:5001/seed/unprotected?force=true"

echo -e "\n🧪 Running Frontend E2E Tests..."
cd ../frontend
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:5001 npx playwright test

# Cleanup
kill $BACKEND_PID || true

echo -e "\n✅ All tests finished!"
