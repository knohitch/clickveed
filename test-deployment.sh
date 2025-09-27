#!/bin/bash

echo "Testing deployment fixes..."

# Test 1: Check if startup.sh exists and is executable
echo "Test 1: Checking startup.sh file..."
if [ -f "startup.sh" ]; then
    echo "✓ startup.sh file exists"
    if [ -x "startup.sh" ]; then
        echo "✓ startup.sh is executable"
    else
        echo "✗ startup.sh is not executable"
        echo "Fixing permissions..."
        chmod +x startup.sh
        echo "✓ Fixed permissions"
    fi
else
    echo "✗ startup.sh file does not exist"
fi

# Test 2: Check Dockerfile for required libraries
echo -e "\nTest 2: Checking Dockerfile for required libraries..."
if grep -q "apk add.*libssl3" Dockerfile; then
    echo "✓ Dockerfile includes libssl3 installation"
else
    echo "✗ Dockerfile missing libssl3 installation"
fi

# Test 3: Check Prisma binary targets
echo -e "\nTest 3: Checking Prisma binary targets..."
if grep -q "linux-musl-openssl-3.0.x" package.json; then
    echo "✓ package.json has correct Prisma binary targets"
else
    echo "✗ package.json missing correct Prisma binary targets"
fi

if grep -q "linux-musl-openssl-3.0.x" prisma/schema.prisma; then
    echo "✓ prisma/schema.prisma has correct Prisma binary targets"
else
    echo "✗ prisma/schema.prisma missing correct Prisma binary targets"
fi

echo -e "\nAll tests completed. If all checks passed, the deployment should work correctly."
