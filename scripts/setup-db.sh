#!/bin/bash
echo "Setting up database..."
cd backend
npm run check-db
npm run setup-productivity
echo "Database setup complete!"