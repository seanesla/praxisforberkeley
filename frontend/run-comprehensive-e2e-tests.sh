#!/bin/bash

# Comprehensive E2E Test Runner for Praxis Learning Platform
# This script runs all comprehensive end-to-end tests with proper setup and cleanup

set -e

echo "🚀 Starting Comprehensive E2E Tests for Praxis Learning Platform"
echo "=================================================="

# Check if required environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "⚠️  Warning: NEXT_PUBLIC_SUPABASE_URL not set. Using default."
  export NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY is required for test user management."
  echo "Please set it in your .env.test.local file or environment."
  exit 1
fi

# Create screenshots directory
mkdir -p screenshots
echo "📁 Created screenshots directory"

# Function to run a specific test suite
run_test_suite() {
  local test_name=$1
  local test_file=$2
  
  echo ""
  echo "🧪 Running $test_name tests..."
  echo "-----------------------------------"
  
  npx playwright test $test_file \
    --reporter=list \
    --reporter=html \
    --config=playwright.config.ts \
    --project=chromium
  
  if [ $? -eq 0 ]; then
    echo "✅ $test_name tests passed!"
  else
    echo "❌ $test_name tests failed!"
    # Continue with other tests even if one fails
  fi
}

# Install dependencies if needed
if [ ! -d "node_modules/@playwright" ]; then
  echo "📦 Installing Playwright..."
  npx playwright install chromium
fi

# Start the development server in the background if not running
if ! curl -s http://localhost:3000 > /dev/null; then
  echo "🌐 Starting development server..."
  npm run dev &
  SERVER_PID=$!
  
  # Wait for server to be ready
  echo "⏳ Waiting for server to be ready..."
  npx wait-on http://localhost:3000 -t 30000
fi

# Run comprehensive test suites
echo ""
echo "🎯 Running all comprehensive test suites..."
echo "=========================================="

# Core feature tests
run_test_suite "Authentication" "e2e/auth-comprehensive.spec.ts"
run_test_suite "Spaced Repetition" "e2e/spaced-repetition-comprehensive.spec.ts"
run_test_suite "Interactive Exercises" "e2e/exercises-comprehensive.spec.ts"
run_test_suite "Knowledge Gap Analysis" "e2e/knowledge-gaps-comprehensive.spec.ts"
run_test_suite "Citation Network" "e2e/citation-network-comprehensive.spec.ts"
run_test_suite "Document Workspace" "e2e/workspace-comprehensive.spec.ts"
run_test_suite "Workflow Automation" "e2e/workflow-comprehensive.spec.ts"
run_test_suite "Analytics Dashboard" "e2e/analytics-comprehensive.spec.ts"

# AI-powered features
run_test_suite "Podcast Generation" "e2e/podcast-comprehensive.spec.ts"
run_test_suite "Socratic Dialogue" "e2e/socratic-comprehensive.spec.ts"

# Integration tests
run_test_suite "Full User Journey" "e2e/integration-comprehensive.spec.ts"
run_test_suite "Performance & Accessibility" "e2e/performance-accessibility.spec.ts"

# Generate test report
echo ""
echo "📊 Generating test report..."
npx playwright show-report

# Create screenshot gallery
echo ""
echo "🖼️  Creating screenshot gallery..."
cat > screenshots/gallery.html << EOF
<!DOCTYPE html>
<html>
<head>
  <title>Praxis E2E Test Screenshots</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #0a0a0a;
      color: #fff;
    }
    h1, h2 {
      color: #a855f7;
    }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .screenshot {
      border: 1px solid #333;
      border-radius: 8px;
      overflow: hidden;
      background: #111;
    }
    .screenshot img {
      width: 100%;
      height: auto;
      display: block;
    }
    .screenshot .caption {
      padding: 10px;
      font-size: 14px;
      color: #999;
    }
    .filter-buttons {
      margin: 20px 0;
    }
    .filter-buttons button {
      background: #a855f7;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      margin-right: 10px;
      cursor: pointer;
    }
    .filter-buttons button:hover {
      background: #9333ea;
    }
    .filter-buttons button.active {
      background: #7c3aed;
    }
  </style>
</head>
<body>
  <h1>Praxis E2E Test Screenshots</h1>
  <p>Generated on $(date)</p>
  
  <div class="filter-buttons">
    <button onclick="filterScreenshots('all')" class="active">All</button>
    <button onclick="filterScreenshots('spaced-repetition')">Spaced Repetition</button>
    <button onclick="filterScreenshots('exercises')">Exercises</button>
    <button onclick="filterScreenshots('knowledge-gaps')">Knowledge Gaps</button>
    <button onclick="filterScreenshots('auth')">Authentication</button>
  </div>
  
  <div class="gallery" id="gallery">
EOF

# Add all screenshots to gallery
for screenshot in screenshots/*.png; do
  if [ -f "$screenshot" ]; then
    filename=$(basename "$screenshot")
    feature=$(echo "$filename" | cut -d'-' -f1)
    echo "    <div class='screenshot' data-feature='$feature'>" >> screenshots/gallery.html
    echo "      <img src='$filename' alt='$filename' />" >> screenshots/gallery.html
    echo "      <div class='caption'>$filename</div>" >> screenshots/gallery.html
    echo "    </div>" >> screenshots/gallery.html
  fi
done

cat >> screenshots/gallery.html << EOF
  </div>
  
  <script>
    function filterScreenshots(feature) {
      const screenshots = document.querySelectorAll('.screenshot');
      const buttons = document.querySelectorAll('button');
      
      buttons.forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
      
      screenshots.forEach(screenshot => {
        if (feature === 'all' || screenshot.dataset.feature === feature) {
          screenshot.style.display = 'block';
        } else {
          screenshot.style.display = 'none';
        }
      });
    }
  </script>
</body>
</html>
EOF

echo "✅ Screenshot gallery created at screenshots/gallery.html"

# Cleanup
if [ ! -z "$SERVER_PID" ]; then
  echo ""
  echo "🛑 Stopping development server..."
  kill $SERVER_PID 2>/dev/null || true
fi

echo ""
echo "🎉 Comprehensive E2E tests completed!"
echo "===================================="
echo ""
echo "📊 View test report: npx playwright show-report"
echo "🖼️  View screenshots: open screenshots/gallery.html"
echo ""

# Exit with appropriate code
if [ -f "test-results/.last-run.json" ]; then
  FAILED_TESTS=$(cat test-results/.last-run.json | grep -o '"failed":[0-9]*' | grep -o '[0-9]*')
  if [ "$FAILED_TESTS" -gt 0 ]; then
    echo "❌ $FAILED_TESTS tests failed"
    exit 1
  fi
fi

echo "✅ All tests passed!"
exit 0