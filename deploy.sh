#!/bin/bash

# Enhanced deployment script with better error handling and validation
set -e # Exit immediately if a command exits with a non-zero status.

echo "🚀 Starting deployment..."

# 1. Pull latest code
echo "⬇️  Pulling latest code from origin main..."
git pull origin main

# 2. Install dependencies
echo "📦 Installing/updating dependencies..."
# Use npm ci for production to ensure deterministic installs
npm ci --omit=dev

# 3. Generate Prisma Client
echo "🧬 Generating Prisma Client..."
npx prisma generate

# 4. Apply database migrations
# This is safe to run even if there are no new migrations.
echo "🗄️  Applying database migrations..."
npx prisma migrate deploy

# 5. Build application
echo "🏗️  Building application for production..."
npm run build

# 6. Check if PM2 is installed and reload application for zero-downtime
echo "🔄 Checking PM2 status..."
if command -v pm2 &> /dev/null; then
    echo "🔄 Reloading application with PM2..."
    pm2 reload clickvid-pro || echo "⚠️  PM2 reload failed, attempting to restart..."
    pm2 restart clickvid-pro || echo "⚠️  PM2 restart also failed"
else
    echo "⚠️  PM2 not found. Skipping PM2 reload. Please install PM2 for zero-downtime deployments."
fi

echo "✅ Deployment complete!"
