#!/bin/bash

echo "=== Deployment Verification Script ==="
echo "This script simulates the Caprover/Coolify deployment process"
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

echo "Step 1: Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed successfully"
echo ""

echo "Step 2: Generating Prisma client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma client"
    exit 1
fi
echo "✅ Prisma client generated successfully"
echo ""

echo "Step 3: Running TypeScript type check..."
# Use increased memory for type checking
NODE_OPTIONS="--max-old-space-size=4096" npx tsc --noEmit --skipLibCheck
if [ $? -ne 0 ]; then
    echo "❌ TypeScript type check failed"
    exit 1
fi
echo "✅ TypeScript type check passed"
echo ""

echo "Step 4: Building Next.js application..."
NODE_OPTIONS="--max-old-space-size=6144" npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi
echo "✅ Build completed successfully"
echo ""

echo "=== Deployment Verification Complete ==="
echo "✅ All checks passed! Your app should deploy successfully on Caprover and Coolify."
echo ""
echo "Note: This script simulates the build process but does not:"
echo "  - Push to GitHub"
echo "  - Deploy to any platform"
echo "  - Modify any remote resources"
