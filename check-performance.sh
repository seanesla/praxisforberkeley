#!/bin/bash

echo "🚀 Praxis Performance Check"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if frontend build exists
if [ ! -d "frontend/.next" ]; then
    echo -e "${YELLOW}No frontend build found. Building now...${NC}"
    cd frontend
    npm run build
    cd ..
fi

echo -e "\n${BLUE}📊 Bundle Size Analysis${NC}"
echo "====================="

# Analyze frontend bundle
cd frontend

# Get total build size
TOTAL_SIZE=$(du -sh .next | cut -f1)
echo "Total build size: $TOTAL_SIZE"

# Get page sizes
echo -e "\nPage bundle sizes:"
if [ -d ".next/static/chunks/pages" ]; then
    du -sh .next/static/chunks/pages/* | sort -hr | head -10
fi

# Check for large dependencies
echo -e "\n${BLUE}📦 Largest Dependencies${NC}"
echo "======================"
cd ..

# Frontend dependencies
echo "Frontend (top 10):"
cd frontend
du -sh node_modules/* 2>/dev/null | sort -hr | head -10

# Backend dependencies
echo -e "\nBackend (top 10):"
cd ../backend
du -sh node_modules/* 2>/dev/null | sort -hr | head -10

cd ..

# Lighthouse metrics (if available)
echo -e "\n${BLUE}🔍 Performance Metrics${NC}"
echo "===================="

# API response times
echo "Testing API endpoints..."

test_endpoint() {
    local endpoint=$1
    local name=$2
    
    if curl -s http://localhost:5001$endpoint > /dev/null 2>&1; then
        TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:5001$endpoint)
        TIME_MS=$(echo "$TIME * 1000" | bc)
        
        if (( $(echo "$TIME < 0.1" | bc -l) )); then
            echo -e "${GREEN}✅ $name: ${TIME_MS}ms${NC}"
        elif (( $(echo "$TIME < 0.5" | bc -l) )); then
            echo -e "${YELLOW}⚠️  $name: ${TIME_MS}ms${NC}"
        else
            echo -e "${RED}❌ $name: ${TIME_MS}ms (slow)${NC}"
        fi
    else
        echo -e "${RED}❌ $name: Not responding${NC}"
    fi
}

# Test various endpoints
test_endpoint "/health" "Health Check"
test_endpoint "/api/auth/session" "Auth Session"
test_endpoint "/api/documents" "Documents List"

# Memory usage
echo -e "\n${BLUE}💾 Memory Usage${NC}"
echo "==============="

# Check Node.js memory usage
if command -v node &> /dev/null; then
    echo "Node.js version: $(node -v)"
    echo "Max memory: $(node -e 'console.log(require("v8").getHeapStatistics().heap_size_limit / 1024 / 1024 + " MB")')"
fi

# Database query performance tips
echo -e "\n${BLUE}🗄️  Database Optimization Tips${NC}"
echo "============================="
echo "1. Ensure all foreign keys have indexes"
echo "2. Use EXPLAIN ANALYZE on slow queries"
echo "3. Consider connection pooling for production"
echo "4. Enable query logging in development"

# Build optimization suggestions
echo -e "\n${BLUE}🎯 Optimization Suggestions${NC}"
echo "=========================="

# Check for common issues
CONSOLE_LOGS=$(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v ".next" | xargs grep -l "console.log" 2>/dev/null | wc -l)
if [ $CONSOLE_LOGS -gt 0 ]; then
    echo -e "${YELLOW}• Remove $CONSOLE_LOGS console.log statements for production${NC}"
fi

# Check image optimization
if [ -d "frontend/public" ]; then
    LARGE_IMAGES=$(find frontend/public -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -size +500k 2>/dev/null | wc -l)
    if [ $LARGE_IMAGES -gt 0 ]; then
        echo -e "${YELLOW}• Optimize $LARGE_IMAGES large images (>500KB)${NC}"
    fi
fi

# Next.js specific optimizations
echo -e "${GREEN}• Enable ISR (Incremental Static Regeneration) for dynamic pages${NC}"
echo -e "${GREEN}• Use next/dynamic for code splitting${NC}"
echo -e "${GREEN}• Implement image optimization with next/image${NC}"
echo -e "${GREEN}• Enable SWC minification in next.config.js${NC}"

echo -e "\n${BLUE}📈 Performance Score Summary${NC}"
echo "==========================="

# Calculate rough performance score
SCORE=100
[ $CONSOLE_LOGS -gt 0 ] && SCORE=$((SCORE - 5))
[ $LARGE_IMAGES -gt 0 ] && SCORE=$((SCORE - 10))

if [ $SCORE -ge 90 ]; then
    echo -e "${GREEN}Overall Performance Score: $SCORE/100 - Excellent!${NC}"
elif [ $SCORE -ge 70 ]; then
    echo -e "${YELLOW}Overall Performance Score: $SCORE/100 - Good, with room for improvement${NC}"
else
    echo -e "${RED}Overall Performance Score: $SCORE/100 - Needs optimization${NC}"
fi

echo -e "\nFor detailed performance analysis, run:"
echo "  cd frontend && npm run build:analyze"