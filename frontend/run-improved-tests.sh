#!/bin/bash

# Enhanced E2E Test Runner Script
# This script provides an easy way to run the improved E2E tests

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
TEST_SUITE="smoke"
BROWSER="chromium"
HEADED=false
UPDATE_SNAPSHOTS=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --suite)
      TEST_SUITE="$2"
      shift 2
      ;;
    --browser)
      BROWSER="$2"
      shift 2
      ;;
    --headed)
      HEADED=true
      shift
      ;;
    --update-snapshots)
      UPDATE_SNAPSHOTS=true
      shift
      ;;
    --help)
      echo "Enhanced E2E Test Runner"
      echo ""
      echo "Usage: ./run-improved-tests.sh [options]"
      echo ""
      echo "Options:"
      echo "  --suite <suite>    Test suite to run (smoke, critical, full, performance, mobile, a11y)"
      echo "  --browser <name>   Browser to use (chromium, firefox, webkit)"
      echo "  --headed           Run tests in headed mode"
      echo "  --update-snapshots Update visual regression snapshots"
      echo "  --help             Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./run-improved-tests.sh --suite smoke"
      echo "  ./run-improved-tests.sh --suite performance --browser chromium"
      echo "  ./run-improved-tests.sh --suite full --headed"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}🚀 Enhanced E2E Test Runner${NC}"
echo -e "Test Suite: ${YELLOW}$TEST_SUITE${NC}"
echo -e "Browser: ${YELLOW}$BROWSER${NC}"
echo -e "Headed: ${YELLOW}$HEADED${NC}"
echo ""

# Clean up previous results
echo -e "${YELLOW}🧹 Cleaning up previous test results...${NC}"
rm -rf test-results playwright-report screenshots .auth

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 Installing dependencies...${NC}"
  npm ci
fi

# Install Playwright browsers if needed
if [ ! -d "$HOME/.cache/ms-playwright" ]; then
  echo -e "${YELLOW}🌐 Installing Playwright browsers...${NC}"
  npx playwright install --with-deps
fi

# Start backend if not running
if ! curl -s http://localhost:3001/health > /dev/null; then
  echo -e "${YELLOW}🚀 Starting backend server...${NC}"
  cd ../backend && npm run dev:test &
  BACKEND_PID=$!
  sleep 5
fi

# Start frontend if not running
if ! curl -s http://localhost:3000 > /dev/null; then
  echo -e "${YELLOW}🚀 Starting frontend server...${NC}"
  npm run dev &
  FRONTEND_PID=$!
  sleep 5
fi

# Build the test command
TEST_CMD="npm run test:e2e:improved"

case $TEST_SUITE in
  smoke)
    TEST_CMD="$TEST_CMD -- --grep @smoke"
    ;;
  critical)
    TEST_CMD="$TEST_CMD -- --grep @critical"
    ;;
  performance)
    TEST_CMD="npm run test:e2e:performance"
    ;;
  mobile)
    TEST_CMD="npm run test:e2e:mobile"
    ;;
  a11y)
    TEST_CMD="npm run test:e2e:a11y"
    ;;
  full)
    TEST_CMD="$TEST_CMD"
    ;;
esac

# Add browser selection
if [ "$BROWSER" != "chromium" ]; then
  TEST_CMD="$TEST_CMD -- --project=$BROWSER"
fi

# Add headed mode
if [ "$HEADED" = true ]; then
  TEST_CMD="$TEST_CMD -- --headed"
fi

# Add update snapshots
if [ "$UPDATE_SNAPSHOTS" = true ]; then
  TEST_CMD="$TEST_CMD -- --update-snapshots"
fi

# Run the tests
echo -e "${GREEN}🧪 Running tests...${NC}"
echo -e "Command: ${YELLOW}$TEST_CMD${NC}"
echo ""

# Execute tests and capture exit code
set +e
eval $TEST_CMD
TEST_EXIT_CODE=$?
set -e

# Generate summary
echo ""
echo -e "${GREEN}📊 Test Summary${NC}"
echo "========================="

if [ -f "test-results/summary.json" ]; then
  TOTAL=$(jq -r '.totalTests' test-results/summary.json)
  PASSED=$(jq -r '.passed' test-results/summary.json)
  FAILED=$(jq -r '.failed' test-results/summary.json)
  SKIPPED=$(jq -r '.skipped' test-results/summary.json)
  DURATION=$(jq -r '.duration' test-results/summary.json)
  
  echo -e "Total Tests: ${YELLOW}$TOTAL${NC}"
  echo -e "✅ Passed: ${GREEN}$PASSED${NC}"
  echo -e "❌ Failed: ${RED}$FAILED${NC}"
  echo -e "⏭️  Skipped: ${YELLOW}$SKIPPED${NC}"
  echo -e "⏱️  Duration: ${YELLOW}$(echo "scale=2; $DURATION/1000" | bc)s${NC}"
fi

# Check for performance violations
if [ -f "test-results/performance-violations.json" ]; then
  echo ""
  echo -e "${YELLOW}⚠️  Performance Violations Detected${NC}"
  jq -r '.violations[]' test-results/performance-violations.json
fi

# Show report location
echo ""
echo -e "${GREEN}📄 Reports${NC}"
echo "HTML Report: file://$(pwd)/playwright-report/index.html"
if [ -f "test-results/performance-report.json" ]; then
  echo "Performance Report: test-results/performance-report.json"
fi

# Cleanup background processes
if [ ! -z "$BACKEND_PID" ]; then
  echo -e "${YELLOW}🛑 Stopping backend server...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
fi

if [ ! -z "$FRONTEND_PID" ]; then
  echo -e "${YELLOW}🛑 Stopping frontend server...${NC}"
  kill $FRONTEND_PID 2>/dev/null || true
fi

# Exit with test exit code
exit $TEST_EXIT_CODE