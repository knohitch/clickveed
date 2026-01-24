#!/bin/bash
set -e

echo "=== Deploying Free Features Fix ==="
echo "This script will update the database with proper feature texts for free feature access."
echo

# Check if we're in a Docker environment
if [ -f "/.dockerenv" ]; then
    echo "Running in Docker container"
    CONTAINER_ENV=true
else
    echo "Running in local environment"
    CONTAINER_ENV=false
fi

# Step 1: Apply database migrations
echo "1. Applying database migrations..."
if [ "$CONTAINER_ENV" = true ]; then
    npx prisma migrate deploy
else
    npx prisma db push
fi

echo "✓ Migrations applied"

# Step 2: Run the updated seed file
echo "2. Seeding database with updated feature texts..."
echo "   This will add the missing feature entries for Free plan."

if command -v tsx &> /dev/null; then
    echo "   Using tsx to run TypeScript seed..."
    tsx prisma/seed.ts
else
    echo "   tsx not found, using fallback SQL seed..."
    # First, let's check if PostgreSQL is available
    if command -v psql &> /dev/null; then
        echo "   Running seed-fallback.sql..."
        psql "$DATABASE_URL" -f seed-fallback.sql
    else
        echo "   psql not found, using Prisma to execute SQL..."
        # Create a temporary script to run the SQL via Prisma
        cat > /tmp/seed-fallback.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    const sql = fs.readFileSync('seed-fallback.sql', 'utf8');
    console.log('Executing SQL seed...');
    await prisma.$executeRawUnsafe(sql);
    console.log('Seed completed');
}

main().catch(console.error).finally(() => prisma.$disconnect());
EOF
        node /tmp/seed-fallback.js
    fi
fi

echo "✓ Database seeded"

# Step 3: Verify the fix
echo "3. Verifying the fix..."
cat > /tmp/verify-fix.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    console.log('Checking Free plan features...');
    
    const freePlan = await prisma.plan.findUnique({
        where: { id: 'plan_free' },
        include: { features: true }
    });
    
    if (!freePlan) {
        console.error('ERROR: Free plan not found!');
        return false;
    }
    
    console.log(`Free plan "${freePlan.name}" has ${freePlan.features.length} features:`);
    freePlan.features.forEach(f => console.log(`  - ${f.text}`));
    
    // Check for key free features
    const requiredFeatures = ['AI Assistant', 'Creative Assistant', 'Social Integrations', 'Media Library', 'Profile Settings'];
    const missingFeatures = requiredFeatures.filter(req => 
        !freePlan.features.some(f => f.text.includes(req))
    );
    
    if (missingFeatures.length > 0) {
        console.error('ERROR: Missing required features:');
        missingFeatures.forEach(f => console.error(`  - ${f}`));
        return false;
    }
    
    console.log('✅ All required free features are present!');
    
    // Check a sample user
    const sampleUser = await prisma.user.findFirst({
        where: { planId: 'plan_free' },
        include: { plan: { include: { features: true } } }
    });
    
    if (sampleUser) {
        console.log(`\nSample user "${sampleUser.email}" has Free plan with ${sampleUser.plan.features.length} features`);
    } else {
        console.log('\nNo users found with Free plan');
    }
    
    return true;
}

verify()
    .then(success => {
        if (success) {
            console.log('\n✅ Free features fix verification PASSED');
            process.exit(0);
        } else {
            console.error('\n❌ Free features fix verification FAILED');
            process.exit(1);
        }
    })
    .catch(err => {
        console.error('Verification error:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
EOF

node /tmp/verify-fix.js

echo
echo "=== Deployment Complete ==="
echo "The free features fix has been deployed."
echo "Free users should now have access to:"
echo "  - AI Assistant"
echo "  - Creative Assistant" 
echo "  - Social Integrations"
echo "  - Media Library"
echo "  - Profile Settings"
echo
echo "Please restart your application server if needed."