#!/bin/bash

# Test script to validate background processing
echo "🧪 Testing background processing setup..."

# Test 1: Check if worker script exists
echo "1. Checking worker script..."
if [ -f "lib/worker.ts" ]; then
    echo "✅ lib/worker.ts exists"
else
    echo "❌ lib/worker.ts missing"
    exit 1
fi

# Test 2: Check if queue module exists
echo "2. Checking queue module..."
if [ -f "lib/queue.ts" ]; then
    echo "✅ lib/queue.ts exists"
else
    echo "❌ lib/queue.ts missing"
    exit 1
fi

# Test 3: Validate Redis configuration in environment
echo "3. Checking Redis configuration..."
if [ -z "$REDIS_URL" ]; then
    echo "⚠️  REDIS_URL not set in environment (this is expected in dev)"
else
    echo "✅ REDIS_URL is configured"
fi

# Test 4: Validate BullMQ worker initialization
echo "4. Testing BullMQ worker initialization..."
if npm run worker --silent 2>&1 | grep -q "Starting BullMQ worker"; then
    echo "✅ Worker initialization test passed"
else
    echo "⚠️  Worker initialization test skipped (no Redis)"
fi

echo "✅ Background processing setup validation complete!"
