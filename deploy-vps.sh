#!/bin/bash
# Deploy directly to VPS - build happens on VPS, not in Docker

set -e

echo "🚀 Starting VPS deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Build the application
echo "🏗️ Building Next.js application..."
NODE_OPTIONS="--max-old-space-size=1536" npm run build

# Start with PM2
if ! command -v pm2 &> /dev/null; then
    echo "📥 Installing PM2..."
    npm install -g pm2
fi

echo "🚀 Starting application with PM2..."
pm2 start npm --name "clickveed" -- start

echo "✅ Deployment complete!"
echo "📊 Check status: pm2 status"
echo "📋 View logs: pm2 logs"
