#!/bin/bash
# Verification script for public directory fix

echo "=== Verifying Public Directory Fix ==="

# Check if public directory exists
if [ -d "public" ]; then
    echo "✓ Public directory exists"
else
    echo "✗ Public directory missing"
    exit 1
fi

# Check if public directory has content
if [ "$(ls -A public)" ]; then
    echo "✓ Public directory has files"
    echo "  Files: $(ls public)"
else
    echo "✗ Public directory is empty"
    exit 1
fi

# Check Dockerfile.caprover for proper public directory handling
if grep -q "Copy public directory from builder stage" Dockerfile.caprover; then
    echo "✓ Dockerfile.caprover has the fix"
else
    echo "✗ Dockerfile.caprover missing the fix"
    exit 1
fi

# Check Dockerfile for proper public directory handling
if grep -q "Copy public directory from builder stage" Dockerfile; then
    echo "✓ Dockerfile has the fix"
else
    echo "✗ Dockerfile missing the fix"
    exit 1
fi

echo ""
echo "=== All checks passed! ==="
echo "The 'stat public/ file does not exist' error should now be fixed."
