#!/bin/bash

echo "=========================================="
echo "PRODUCTION SIMULATION TEST SUITE"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track errors
ERRORS=0
WARNINGS=0

echo "1. Checking TypeScript compilation..."
echo "-------------------------------------------"
if npx tsc --noEmit 2>&1 | tee tsc-output.log; then
    echo -e "${GREEN}✓ TypeScript compilation successful${NC}"
else
    echo -e "${RED}✗ TypeScript compilation failed${NC}"
    ERRORS=$((ERRORS+1))
    cat tsc-output.log
fi
echo ""

echo "2. Running ESLint..."
echo "-------------------------------------------"
if npm run lint 2>&1 | tee eslint-output.log; then
    echo -e "${GREEN}✓ ESLint check passed${NC}"
else
    echo -e "${RED}✗ ESLint check failed${NC}"
    WARNINGS=$((WARNINGS+1))
    cat eslint-output.log
fi
echo ""

echo "3. Checking for production build issues..."
echo "-------------------------------------------"
NODE_ENV=production npm run build 2>&1 | tee build-output.log
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Production build successful${NC}"
else
    echo -e "${RED}✗ Production build failed${NC}"
    ERRORS=$((ERRORS+1))
    cat build-output.log
fi
echo ""

echo "4. Checking Docker configuration..."
echo "-------------------------------------------"
if [ -f "Dockerfile" ]; then
    echo -e "${GREEN}✓ Dockerfile exists${NC}"
    if docker build --dry-run -f Dockerfile . 2>&1 | tee docker-output.log; then
        echo -e "${GREEN}✓ Docker configuration valid${NC}"
    else
        echo -e "${YELLOW}⚠ Docker configuration has warnings${NC}"
        WARNINGS=$((WARNINGS+1))
    fi
else
    echo -e "${RED}✗ Dockerfile not found${NC}"
    ERRORS=$((ERRORS+1))
fi
echo ""

echo "5. Checking environment variables..."
echo "-------------------------------------------"
if [ -f ".env.example" ]; then
    echo -e "${GREEN}✓ .env.example exists${NC}"
    # Check for critical variables
    critical_vars=("DATABASE_URL" "NEXTAUTH_SECRET" "AUTH_SECRET" "STRIPE_SECRET_KEY")
    for var in "${critical_vars[@]}"; do
        if grep -q "$var" .env.example; then
            echo -e "${GREEN}✓ $var documented${NC}"
        else
            echo -e "${YELLOW}⚠ $var not documented in .env.example${NC}"
            WARNINGS=$((WARNINGS+1))
        fi
    done
else
    echo -e "${YELLOW}⚠ .env.example not found${NC}"
    WARNINGS=$((WARNINGS+1))
fi
echo ""

echo "6. Checking for common production issues..."
echo "-------------------------------------------"

# Check for console.log in production code
if grep -r "console\.log" src/app src/components src/lib --exclude-dir=node_modules 2>/dev/null | grep -v "skip-lint" | tee console-check.log; then
    echo -e "${YELLOW}⚠ Found console.log statements in production code${NC}"
    WARNINGS=$((WARNINGS+1))
else
    echo -e "${GREEN}✓ No console.log statements found${NC}"
fi

# Check for hardcoded secrets
if grep -rE "(API_KEY|SECRET|PASSWORD)\s*=\s*[\"']" src/app src/components src/lib --exclude-dir=node_modules 2>/dev/null | grep -v ".env" | tee secret-check.log; then
    echo -e "${RED}✗ Found potential hardcoded secrets${NC}"
    ERRORS=$((ERRORS+1))
else
    echo -e "${GREEN}✓ No hardcoded secrets found${NC}"
fi

# Check for React Hook violations
if npx eslint-plugin-react-hooks --files "src/**/*.{tsx,ts}" 2>/dev/null; then
    echo -e "${GREEN}✓ No React Hook violations found${NC}"
else
    echo -e "${YELLOW}⚠ React Hook violations may exist${NC}"
    WARNINGS=$((WARNINGS+1))
fi
echo ""

echo "7. Checking deployment configurations..."
echo "-------------------------------------------"
if [ -f "Dockerfile" ]; then
    echo -e "${GREEN}✓ Docker configuration found${NC}"
else
    echo -e "${YELLOW}⚠ No Docker configuration found${NC}"
    WARNINGS=$((WARNINGS+1))
fi

if [ -f "docker-compose.yml" ]; then
    echo -e "${GREEN}✓ Docker Compose configuration found${NC}"
else
    echo -e "${YELLOW}⚠ No Docker Compose configuration found${NC}"
fi

if [ -f "apphosting.yaml" ] || [ -f "coolify.json" ] || [ -f "caprover-app.json" ]; then
    echo -e "${GREEN}✓ Deployment configuration found${NC}"
else
    echo -e "${YELLOW}⚠ No deployment configuration found${NC}"
fi
echo ""

echo "8. Checking package.json scripts..."
echo "-------------------------------------------"
if grep -q '"build"' package.json && grep -q '"start"' package.json; then
    echo -e "${GREEN}✓ Required scripts present${NC}"
else
    echo -e "${RED}✗ Missing required scripts in package.json${NC}"
    ERRORS=$((ERRORS+1))
fi
echo ""

echo "=========================================="
echo "SIMULATION SUMMARY"
echo "=========================================="
echo -e "${RED}Errors: $ERRORS${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ Ready for production deployment!${NC}"
    exit 0
else
    echo -e "${RED}✗ Cannot deploy to production. Please fix errors.${NC}"
    exit 1
fi
