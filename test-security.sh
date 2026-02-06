#!/bin/bash

# Test script to validate security improvements
echo "🧪 Testing security improvements..."

# Test 1: Check if security modules exist
echo "1. Checking security modules..."
if [ -f "src/lib/rate-limiter.ts" ]; then
    echo "✅ src/lib/rate-limiter.ts exists"
else
    echo "❌ src/lib/rate-limiter.ts missing"
    exit 1
fi

if [ -f "src/lib/security-headers.ts" ]; then
    echo "✅ src/lib/security-headers.ts exists"
else
    echo "❌ src/lib/security-headers.ts missing"
    exit 1
fi

if [ -f "src/lib/file-upload-security.ts" ]; then
    echo "✅ src/lib/file-upload-security.ts exists"
else
    echo "❌ src/lib/file-upload-security.ts missing"
    exit 1
fi

# Test 2: Validate middleware uses new rate limiter
echo "2. Checking middleware for rate limiter usage..."
if grep -q "RateLimiter" "src/middleware.ts"; then
    echo "✅ Middleware uses RateLimiter"
else
    echo "❌ Middleware does not use RateLimiter"
fi

# Test 3: Validate file upload security
echo "3. Checking file upload security..."
if grep -q "FileUploadSecurity" "src/app/api/upload/route.ts"; then
    echo "✅ File upload uses FileUploadSecurity"
else
    echo "❌ File upload does not use FileUploadSecurity"
fi

# Test 4: Check for security headers in Next.js config
echo "4. Checking Next.js configuration for security..."
if grep -q "Content-Security-Policy" "next.config.mjs"; then
    echo "✅ Next.js config has CSP"
else
    echo "⚠️  Next.js config lacks CSP (expected in current config)"
fi

echo "✅ Security improvements validation complete!"
