#!/bin/bash

echo "Testing deployment fixes for CapRover..."

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

# Test 2: Check if startup.sh uses correct Next.js standalone path
echo -e "\nTest 2: Checking startup.sh Next.js standalone path..."
if grep -q "node .next/standalone/server.js" startup.sh; then
    echo "✓ startup.sh uses correct Next.js standalone path"
else
    echo "✗ startup.sh may not use correct Next.js standalone path"
fi

# Test 3: Check Dockerfile.caprover for required libraries
echo -e "\nTest 3: Checking Dockerfile.caprover for required libraries..."
if grep -q "openssl" Dockerfile.caprover; then
    echo "✓ Dockerfile.caprover includes openssl installation"
else
    echo "✗ Dockerfile.caprover missing openssl installation"
fi

if grep -q "postgresql-client" Dockerfile.caprover; then
    echo "✓ Dockerfile.caprover includes postgresql-client"
else
    echo "✗ Dockerfile.caprover missing postgresql-client"
fi

# Test 4: Check Prisma binary targets
echo -e "\nTest 4: Checking Prisma binary targets..."
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

# Test 5: Check next.config.mjs for standalone output
echo -e "\nTest 5: Checking next.config.mjs for standalone output..."
if grep -q "output: 'standalone'" next.config.mjs; then
    echo "✓ next.config.mjs has standalone output enabled"
else
    echo "✗ next.config.mjs missing standalone output"
fi

# Test 6: Check ESLint configuration
echo -e "\nTest 6: Checking ESLint configuration..."
if [ -f ".eslintrc.json" ]; then
    echo "✓ .eslintrc.json exists"
else
    echo "✗ .eslintrc.json missing"
fi

# Test 7: Check for server.js or standalone server support in startup.sh
echo -e "\nTest 7: Checking startup.sh server fallback..."
if grep -q '\[ -f "server.js" \]' startup.sh; then
    echo "✓ startup.sh has server.js fallback check"
else
    echo "✗ startup.sh may not have proper server fallback"
fi

echo -e "\nAll tests completed. If all checks passed, the deployment should work correctly."
