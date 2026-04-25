#!/bin/bash
set -e

echo "🧪 Running Backend Non-Regression Tests..."
cd rental-platform/backend
npm test

echo -e "\n🧪 Running Frontend E2E Tests..."
cd ../frontend
npx playwright test

echo -e "\n✅ All tests passed successfully!"
