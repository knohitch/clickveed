#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "🚀 Starting deployment..."

# 1. Pull latest code
echo "⬇️  Pulling latest code from origin main..."
git pull origin main

# 2. Install dependencies
echo "📦 Installing/updating dependencies..."
npm install

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

# 6. Reload application with PM2 for zero-downtime
echo "🔄 Reloading application with PM2..."
pm2 reload clickvid-pro

echo "✅ Deployment complete!"
