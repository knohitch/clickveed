#!/bin/bash

# Test script to validate monitoring implementations
echo "🧪 Testing monitoring implementations..."

# Test 1: Check if monitoring modules exist
echo "1. Checking monitoring modules..."
if [ -f "src/lib/sentry.server.config.ts" ]; then
    echo "✅ src/lib/sentry.server.config.ts exists"
else
    echo "❌ src/lib/sentry.server.config.ts missing"
    exit 1
fi

if [ -f "src/lib/backup-manager.ts" ]; then
    echo "✅ src/lib/backup-manager.ts exists"
else
    echo "❌ src/lib/backup-manager.ts missing"
    exit 1
fi

if [ -f "src/lib/resource-monitor.ts" ]; then
    echo "✅ src/lib/resource-monitor.ts exists"
else
    echo "❌ src/lib/resource-monitor.ts missing"
    exit 1
fi

# Test 2: Check if monitoring endpoints exist
echo "2. Checking monitoring endpoints..."
if [ -f "src/app/api/health/route.ts" ]; then
    echo "✅ src/app/api/health/route.ts exists"
else
    echo "❌ src/app/api/health/route.ts missing"
    exit 1
fi

if [ -f "src/app/api/monitoring/route.ts" ]; then
    echo "✅ src/app/api/monitoring/route.ts exists"
else
    echo "❌ src/app/api/monitoring/route.ts missing"
    exit 1
fi

# Test 3: Validate Sentry configuration
echo "3. Checking Sentry configuration..."
if grep -q "SENTRY_DSN" ".env.example"; then
    echo "✅ .env.example contains SENTRY_DSN"
else
    echo "⚠️  .env.example missing SENTRY_DSN (expected in dev)"
fi

# Test 4: Validate backup directory structure
echo "4. Checking backup directory..."
if [ -d "backups" ]; then
    echo "✅ Backups directory exists"
else
    echo "⚠️  Backups directory does not exist (will be created on demand)"
fi

echo "✅ Monitoring implementations validation complete!"
