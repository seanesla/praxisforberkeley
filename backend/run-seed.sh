#!/bin/bash

# Seed Demo Data Script
# This script seeds the database with demo data for testing

set -e

echo "🌱 Praxis Demo Data Seeder"
echo "========================="
echo ""

# Check if TypeScript is installed
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js and npm."
    exit 1
fi

# Check environment variables
if [ ! -f .env ]; then
    echo "❌ .env file not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file. Please update it with your credentials."
        exit 1
    else
        echo "❌ .env.example not found either. Please create .env file."
        exit 1
    fi
fi

# Source environment variables
source .env

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY not set in .env file"
    echo "This is required for creating demo users."
    echo "You can find it in your Supabase project settings."
    exit 1
fi

echo "🔍 Checking database connection..."
# You could add a database connection check here

echo ""
echo "⚠️  WARNING: This will create demo data in your database."
echo "⚠️  Make sure you're not running this on a production database!"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Seed cancelled."
    exit 1
fi

echo ""
echo "🚀 Running seed script..."
echo ""

# Run the TypeScript seed script
npx ts-node src/scripts/seed-demo-data.ts

echo ""
echo "✅ Seed completed!"
echo ""
echo "You can now log in with the demo accounts shown above."
echo ""