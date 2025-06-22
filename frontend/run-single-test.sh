#!/bin/bash

# Run a single test file with visual output
# Usage: ./run-single-test.sh <test-file>

TEST_FILE=${1:-"e2e/auth-comprehensive.spec.ts"}

echo "🚀 Running test: $TEST_FILE"
echo "=============================================="

# Create directories
mkdir -p screenshots
mkdir -p test-results

# Make sure services are running
cd ../backend
if ! lsof -i:5001 > /dev/null; then
  echo "🔧 Starting backend..."
  npm run dev &
  BACKEND_PID=$!
  sleep 5
fi

cd ../frontend
if ! lsof -i:3000 > /dev/null; then
  echo "🔧 Starting frontend..."
  npm run dev &
  FRONTEND_PID=$!
  sleep 8
fi

# Run the test
npx playwright test "$TEST_FILE" \
  --headed \
  --project=chromium \
  --reporter=list,html \
  --screenshot=on \
  --video=on \
  --trace=on \
  --timeout=300000 \
  --max-failures=3

# Show results
echo ""
echo "✨ Test complete!"
echo "Screenshots: $(ls -la screenshots/*.png 2>/dev/null | wc -l) files"
echo ""
echo "To view report: npx playwright show-report"