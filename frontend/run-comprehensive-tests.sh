#!/bin/bash

# Comprehensive Test Runner for Praxis Application
# This script runs all tests with screenshots and videos

echo "🚀 Starting Comprehensive Test Suite for Praxis"
echo "=============================================="

# Set up environment
export NODE_ENV=test
export PWDEBUG=0

# Create directories for test artifacts
mkdir -p screenshots
mkdir -p test-results
mkdir -p test-videos

# Function to run tests with retries
run_test_suite() {
  local test_file=$1
  local test_name=$2
  local max_retries=2
  local retry_count=0
  
  echo ""
  echo "📋 Running: $test_name"
  echo "----------------------------------------"
  
  while [ $retry_count -lt $max_retries ]; do
    npx playwright test "$test_file" \
      --headed \
      --project=chromium \
      --reporter=list,html \
      --screenshot=on \
      --video=on \
      --trace=on-first-retry \
      --timeout=300000 \
      --output=test-results/ \
      --max-failures=5
    
    if [ $? -eq 0 ]; then
      echo "✅ $test_name completed successfully"
      return 0
    else
      retry_count=$((retry_count + 1))
      if [ $retry_count -lt $max_retries ]; then
        echo "⚠️ Test failed, retrying ($retry_count/$max_retries)..."
        sleep 5
      fi
    fi
  done
  
  echo "❌ $test_name failed after $max_retries attempts"
  return 1
}

# Function to capture summary screenshots
capture_summary() {
  echo ""
  echo "📸 Capturing summary screenshots..."
  echo "----------------------------------------"
  
  # Create a summary HTML page
  cat > test-results/summary.html << EOF
<!DOCTYPE html>
<html>
<head>
  <title>Test Summary</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .test-section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
    .screenshots { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 10px; }
    img { width: 100%; height: auto; border: 1px solid #ccc; }
    .success { background: #d4edda; }
    .failure { background: #f8d7da; }
  </style>
</head>
<body>
  <h1>Praxis Application - Comprehensive Test Results</h1>
  <div class="test-section">
    <h2>Test Execution Summary</h2>
    <p>Date: $(date)</p>
    <p>Total Test Files: 9</p>
  </div>
  <div class="test-section">
    <h2>Key Screenshots</h2>
    <div class="screenshots">
EOF

  # Add screenshots to summary
  for screenshot in screenshots/*.png; do
    if [ -f "$screenshot" ]; then
      filename=$(basename "$screenshot")
      echo "      <div><h4>$filename</h4><img src=\"../$screenshot\" alt=\"$filename\"></div>" >> test-results/summary.html
    fi
  done

  cat >> test-results/summary.html << EOF
    </div>
  </div>
</body>
</html>
EOF
}

# Start testing
echo "🔧 Starting backend services..."
cd ../backend
npm run dev &
BACKEND_PID=$!
sleep 5

cd ../frontend

echo "🔧 Starting frontend in test mode..."
npm run dev &
FRONTEND_PID=$!
sleep 10

# Install Playwright browsers if needed
echo "🔧 Ensuring Playwright browsers are installed..."
npx playwright install chromium

# Run all test suites
TEST_RESULTS=()

# 1. Authentication Tests
if run_test_suite "e2e/auth-comprehensive.spec.ts" "Authentication Tests"; then
  TEST_RESULTS+=("✅ Authentication")
else
  TEST_RESULTS+=("❌ Authentication")
fi

# 2. Flashcards Tests
if run_test_suite "e2e/flashcards-comprehensive.spec.ts" "Flashcards Tests"; then
  TEST_RESULTS+=("✅ Flashcards")
else
  TEST_RESULTS+=("❌ Flashcards")
fi

# 3. Mind Maps Tests
if run_test_suite "e2e/mindmaps-comprehensive.spec.ts" "Mind Maps Tests"; then
  TEST_RESULTS+=("✅ Mind Maps")
else
  TEST_RESULTS+=("❌ Mind Maps")
fi

# 4. 2D Physics Tests
if run_test_suite "e2e/physics-2d-comprehensive.spec.ts" "2D Physics & STEM Tests"; then
  TEST_RESULTS+=("✅ 2D Physics")
else
  TEST_RESULTS+=("❌ 2D Physics")
fi

# 5. 3D STEM Visualization Tests
if run_test_suite "e2e/stem-viz-3d-comprehensive.spec.ts" "3D STEM Visualization Tests"; then
  TEST_RESULTS+=("✅ 3D STEM Viz")
else
  TEST_RESULTS+=("❌ 3D STEM Viz")
fi

# 6. Integration Tests
if run_test_suite "e2e/integration-comprehensive.spec.ts" "Integration Tests"; then
  TEST_RESULTS+=("✅ Integration")
else
  TEST_RESULTS+=("❌ Integration")
fi

# 7. Performance & Accessibility Tests
if run_test_suite "e2e/performance-accessibility.spec.ts" "Performance & Accessibility Tests"; then
  TEST_RESULTS+=("✅ Performance & A11y")
else
  TEST_RESULTS+=("❌ Performance & A11y")
fi

# Generate summary
capture_summary

# Print final results
echo ""
echo "=============================================="
echo "📊 FINAL TEST RESULTS"
echo "=============================================="
for result in "${TEST_RESULTS[@]}"; do
  echo "$result"
done
echo "=============================================="

# Count screenshots
SCREENSHOT_COUNT=$(find screenshots -name "*.png" | wc -l)
echo ""
echo "📸 Total screenshots captured: $SCREENSHOT_COUNT"
echo "📹 Test videos saved in: test-results/"
echo "📊 HTML report available at: playwright-report/index.html"
echo "📝 Summary page: test-results/summary.html"

# Clean up
echo ""
echo "🧹 Cleaning up..."
kill $FRONTEND_PID 2>/dev/null
kill $BACKEND_PID 2>/dev/null

echo ""
echo "✨ Comprehensive testing complete!"
echo ""
echo "To view results:"
echo "  - Screenshots: open screenshots/"
echo "  - HTML Report: npx playwright show-report"
echo "  - Summary: open test-results/summary.html"

# Open results in browser
if command -v open &> /dev/null; then
  open test-results/summary.html
  open playwright-report/index.html
elif command -v xdg-open &> /dev/null; then
  xdg-open test-results/summary.html
  xdg-open playwright-report/index.html
fi