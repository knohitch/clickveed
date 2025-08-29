#!/bin/bash
set -e

echo "🚀 Starting production setup..."

# Step 1: Install production dependencies
# This installs only the packages needed to run the app in production (--omit=dev).
echo "📦 Installing production dependencies..."
npm ci --omit=dev

# Step 2: Generate Prisma Client
# Ensures the Prisma client is up-to-date with your schema. This is crucial for production.
echo "🧬 Generating Prisma Client..."
npx prisma generate

# Step 3: Apply database migrations
# This command reads the migration files and applies them to your production database.
echo "🗄️ Applying database migrations..."
npx prisma migrate deploy

# Step 4: Build the application for production
# This creates an optimized version of your app in the .next folder.
echo "🏗️ Building the Next.js application..."
npm run build

echo "✅ Production setup complete!"
echo "Your application is now ready to be started with a process manager like PM2."
echo "Example: pm2 start npm --name 'your-app-name' -- start"
