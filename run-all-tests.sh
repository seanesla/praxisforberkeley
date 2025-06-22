#!/bin/bash

echo "🚀 Running Comprehensive Test Suite for Praxis"
echo "============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall success
OVERALL_SUCCESS=true

# Function to run a command and check its status
run_test() {
    local test_name=$1
    local command=$2
    
    echo -e "${YELLOW}Running: $test_name${NC}"
    if eval $command; then
        echo -e "${GREEN}✅ $test_name passed${NC}\n"
    else
        echo -e "${RED}❌ $test_name failed${NC}\n"
        OVERALL_SUCCESS=false
    fi
}

# 1. Backend Tests
echo "📦 BACKEND TESTS"
echo "================"
cd backend

# Lint check
run_test "Backend Linting" "npm run lint"

# Type check
run_test "Backend Type Check" "npm run typecheck"

# Unit tests
run_test "Backend Unit Tests" "npm test"

cd ..

# 2. Frontend Tests
echo -e "\n📱 FRONTEND TESTS"
echo "=================="
cd frontend

# Lint check
run_test "Frontend Linting" "npm run lint"

# Type check
run_test "Frontend Type Check" "npm run typecheck"

# Build test
run_test "Frontend Build" "npm run build"

# E2E tests (headless)
echo -e "${YELLOW}Running E2E Tests (this may take a while)...${NC}"
run_test "E2E Tests" "npm run test:e2e"

cd ..

# 3. Performance Checks
echo -e "\n⚡ PERFORMANCE CHECKS"
echo "======================"

# Check bundle size
echo -e "${YELLOW}Checking bundle sizes...${NC}"
cd frontend
if [ -d ".next" ]; then
    echo "Build output found. Analyzing bundle sizes..."
    # Get the size of the .next directory
    BUILD_SIZE=$(du -sh .next | cut -f1)
    echo "Total build size: $BUILD_SIZE"
    
    # Check if build size is reasonable (less than 50MB)
    BUILD_SIZE_MB=$(du -sm .next | cut -f1)
    if [ $BUILD_SIZE_MB -lt 50 ]; then
        echo -e "${GREEN}✅ Bundle size is acceptable ($BUILD_SIZE)${NC}"
    else
        echo -e "${RED}❌ Bundle size is too large ($BUILD_SIZE)${NC}"
        OVERALL_SUCCESS=false
    fi
else
    echo -e "${YELLOW}No build output found. Run 'npm run build' first.${NC}"
fi

cd ..

# 4. Database Seed Test
echo -e "\n🌱 DATABASE SEED TEST"
echo "====================="
cd backend

# Check if seed script exists
if [ -f "src/seeds/index.ts" ]; then
    echo -e "${GREEN}✅ Seed scripts are present${NC}"
else
    echo -e "${RED}❌ Seed scripts not found${NC}"
    OVERALL_SUCCESS=false
fi

cd ..

# 5. API Response Time Test
echo -e "\n🔌 API HEALTH CHECK"
echo "===================="

# Check if backend is running
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API is responsive${NC}"
    
    # Test a few endpoints
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:5001/health)
    echo "Health endpoint response time: ${RESPONSE_TIME}s"
    
    # Check if response time is acceptable (less than 1 second)
    if (( $(echo "$RESPONSE_TIME < 1" | bc -l) )); then
        echo -e "${GREEN}✅ API response time is good${NC}"
    else
        echo -e "${YELLOW}⚠️  API response time is slow${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Backend API is not running. Start it with 'npm run dev' in the backend directory${NC}"
fi

# 6. Check for console errors
echo -e "\n🔍 CODE QUALITY CHECKS"
echo "======================="

# Check for console.log statements in production code
echo "Checking for console.log statements..."
CONSOLE_LOGS=$(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v ".next" | xargs grep -l "console.log" | wc -l)
if [ $CONSOLE_LOGS -eq 0 ]; then
    echo -e "${GREEN}✅ No console.log statements found${NC}"
else
    echo -e "${YELLOW}⚠️  Found $CONSOLE_LOGS files with console.log statements${NC}"
fi

# Check for TODO comments
echo "Checking for TODO comments..."
TODOS=$(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v ".next" | xargs grep -i "TODO" | wc -l)
echo "Found $TODOS TODO comments"

# Final Summary
echo -e "\n📊 TEST SUMMARY"
echo "==============="

if [ "$OVERALL_SUCCESS" = true ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo ""
    echo "The application is ready for deployment!"
    echo ""
    echo "Demo credentials:"
    echo "  Email: demo@praxis.edu"
    echo "  Password: demo123456"
    echo ""
    echo "To seed the database with demo data, run:"
    echo "  cd backend && npm run seed:demo"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    echo "Please fix the failing tests before proceeding."
    exit 1
fi