#!/usr/bin/env node

/**
 * Diagnostic script to test Stripe plan integration
 * Checks:
 * 1. Database connectivity
 * 2. Plan configuration with Stripe Price IDs
 * 3. Plan feature mapping
 * 4. User plan assignment flow
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Testing Stripe Plan Integration');
  
  try {
    // 1. Test database connection
    console.log('\n1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // 2. Check plans in database
    console.log('\n2. Checking plans in database...');
    const plans = await prisma.plan.findMany({
      include: {
        features: true
      }
    });
    
    console.log(`Found ${plans.length} plans:`);
    plans.forEach(plan => {
      console.log(`\n  Plan: ${plan.name} (ID: ${plan.id})`);
      console.log(`    Feature Tier: ${plan.featureTier || 'free'}`);
      console.log(`    Monthly Price: $${plan.priceMonthly}`);
      console.log(`    Monthly Stripe Price ID: ${plan.stripePriceIdMonthly || 'NOT SET'}`);
      console.log(`    Quarterly Stripe Price ID: ${plan.stripePriceIdQuarterly || 'NOT SET'}`);
      console.log(`    Yearly Stripe Price ID: ${plan.stripePriceIdYearly || 'NOT SET'}`);
      console.log(`    Features: ${plan.features.length} features`);
      plan.features.forEach(f => console.log(`      - ${f.text}`));
    });
    
    // 3. Check for duplicate Stripe Price IDs
    console.log('\n3. Checking for duplicate Stripe Price IDs...');
    const allPriceIds = [];
    plans.forEach(plan => {
      if (plan.stripePriceIdMonthly) allPriceIds.push({ id: plan.stripePriceIdMonthly, plan: plan.name, type: 'monthly' });
      if (plan.stripePriceIdQuarterly) allPriceIds.push({ id: plan.stripePriceIdQuarterly, plan: plan.name, type: 'quarterly' });
      if (plan.stripePriceIdYearly) allPriceIds.push({ id: plan.stripePriceIdYearly, plan: plan.name, type: 'yearly' });
    });
    
    const duplicates = allPriceIds.filter((item, index, array) => 
      array.findIndex(t => t.id === item.id && t.id) !== index && item.id
    );
    
    if (duplicates.length > 0) {
      console.warn('⚠️  Found duplicate Stripe Price IDs:');
      duplicates.forEach(d => console.warn(`    ${d.id} used by ${d.plan} (${d.type})`));
    } else {
      console.log('✅ No duplicate Stripe Price IDs found');
    }
    
    // 4. Check users with plans
    console.log('\n4. Checking users with plans...');
    const users = await prisma.user.findMany({
      include: {
        plan: true
      },
      take: 10
    });
    
    console.log(`Sample of ${users.length} users:`);
    users.forEach(user => {
      console.log(`  ${user.email} (${user.role}): Plan = ${user.plan?.name || 'None'} (ID: ${user.planId || 'None'})`);
    });
    
    // 5. Check plan feature mapping
    console.log('\n5. Testing plan feature access...');
    const testUser = users[0];
    if (testUser && testUser.plan) {
      const planWithFeatures = await prisma.plan.findUnique({
        where: { id: testUser.plan.id },
        include: { features: true }
      });
      
      if (planWithFeatures) {
        console.log(`User ${testUser.email} has plan ${planWithFeatures.name} with ${planWithFeatures.features.length} features`);
        if (planWithFeatures.features.length === 0) {
          console.warn('⚠️  This plan has no features defined - users may not have access to any features');
        }
      }
    }
    
    // 6. Test Stripe webhook plan matching logic
    console.log('\n6. Testing Stripe webhook plan matching logic...');
    const testPriceId = plans.find(p => p.stripePriceIdMonthly)?.stripePriceIdMonthly;
    if (testPriceId) {
      const matchedPlan = await prisma.plan.findFirst({
        where: { 
          OR: [
            { stripePriceIdMonthly: testPriceId },
            { stripePriceIdQuarterly: testPriceId },
            { stripePriceIdYearly: testPriceId },
          ]
        }
      });
      
      if (matchedPlan) {
        console.log(`✅ Stripe Price ID ${testPriceId.substring(0, 20)}... matches plan: ${matchedPlan.name}`);
      } else {
        console.error(`❌ Stripe Price ID ${testPriceId.substring(0, 20)}... does not match any plan`);
      }
    } else {
      console.log('⏭️  No Stripe Price IDs configured to test matching');
    }
    
    console.log('\n📋 Summary:');
    const plansWithoutStripeIds = plans.filter(p => !p.stripePriceIdMonthly && !p.stripePriceIdQuarterly && !p.stripePriceIdYearly);
    if (plansWithoutStripeIds.length > 0) {
      console.warn(`⚠️  ${plansWithoutStripeIds.length} plans have no Stripe Price IDs configured:`);
      plansWithoutStripeIds.forEach(p => console.warn(`    - ${p.name}`));
    }
    
    const plansWithoutFeatures = plans.filter(p => p.features.length === 0);
    if (plansWithoutFeatures.length > 0) {
      console.warn(`⚠️  ${plansWithoutFeatures.length} plans have no features:`);
      plansWithoutFeatures.forEach(p => console.warn(`    - ${p.name}`));
    }
    
    console.log('\n✅ Diagnostic complete');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    if (error.message.includes('Can\'t reach database server')) {
      console.error('\n💡 Database connection issue detected.');
      console.error('   This may be because:');
      console.error('   1. Database container is not running');
      console.error('   2. DATABASE_URL environment variable is incorrect');
      console.error('   3. Network connectivity issues');
      console.error('\n   For CapRover deployment, ensure PostgreSQL service is running.');
      console.error('   Run: captaincli logs -s postgres');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);