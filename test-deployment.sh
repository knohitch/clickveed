#!/bin/bash

# Test script to validate deployment process
echo "🧪 Testing deployment process..."

# Test 1: Check if deployment script exists and is executable
echo "1. Checking deployment script..."
if [ -f "deploy.sh" ] && [ -x "deploy.sh" ]; then
    echo "✅ deploy.sh exists and is executable"
else
    echo "❌ deploy.sh missing or not executable"
    exit 1
fi

# Test 2: Check if install script exists and is executable
echo "2. Checking install script..."
if [ -f "install.sh" ] && [ -x "install.sh" ]; then
    echo "✅ install.sh exists and is executable"
else
    echo "❌ install.sh missing or not executable"
    exit 1
fi

# Test 3: Validate package.json scripts
echo "3. Validating package.json build scripts..."
if npm run build >/dev/null 2>&1; then
    echo "✅ Build script works correctly"
else
    echo "❌ Build script failed"
    exit 1
fi

# Test 4: Check Prisma setup
echo "4. Checking Prisma setup..."
if npx prisma generate >/dev/null 2>&1; then
    echo "✅ Prisma generation works"
else
    echo "❌ Prisma generation failed"
    exit 1
fi

# Test 5: Validate Next.js build
echo "5. Validating Next.js build..."
if [ -d ".next" ]; then
    echo "✅ Next.js build directory exists"
else
    echo "⚠️  Next.js build directory not found (expected in clean environment)"
fi

echo "✅ All deployment tests passed!"
