#!/usr/bin/env node

/**
 * Diagnostic script to check why free features aren't working
 * Checks:
 * 1. Database connectivity
 * 2. Free plan existence
 * 3. Free plan features configuration
 * 4. User assignments
 * 5. Feature access logic
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking Free Features Configuration');
  console.log('=======================================\n');
  
  try {
    // 1. Test database connection
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful\n');
    
    // 2. Check for Free plan
    console.log('2. Looking for Free plan...');
    const freePlan = await prisma.plan.findFirst({
      where: {
        OR: [
          { name: 'Free' },
          { featureTier: 'free' },
          { priceMonthly: 0 }
        ]
      },
      include: {
        features: true
      }
    });
    
    if (!freePlan) {
      console.error('❌ CRITICAL: No Free plan found in database!');
      console.log('\nAvailable plans:');
      const allPlans = await prisma.plan.findMany({
        select: { name: true, priceMonthly: true, featureTier: true }
      });
      allPlans.forEach(p => console.log(`  - ${p.name}: $${p.priceMonthly} (tier: ${p.featureTier || 'none'})`));
      return;
    }
    
    console.log(`✅ Found Free plan: "${freePlan.name}" (ID: ${freePlan.id})`);
    console.log(`   Price: $${freePlan.priceMonthly}`);
    console.log(`   Feature Tier: ${freePlan.featureTier || 'free'}`);
    console.log(`   Features configured: ${freePlan.features.length}\n`);
    
    // 3. Check Free plan features
    console.log('3. Checking Free plan features...');
    if (freePlan.features.length === 0) {
      console.warn('⚠️  WARNING: Free plan has NO features configured!');
      console.log('   This means free users cannot access any features.');
      console.log('   Fix: Add features to Free plan via /chin/dashboard/plans\n');
    } else {
      console.log('✅ Free plan has features:');
      freePlan.features.forEach((f, i) => console.log(`   ${i+1}. ${f.text}`));
      console.log();
    }
    
    // 4. Check default free features from configuration
    console.log('4. Comparing with default free features...');
    const defaultFreeFeatures = [
      'ai-assistant',
      'creative-assistant', 
      'social-integrations',
      'media-library',
      'profile-settings'
    ];
    
    console.log('Default free features from config:');
    defaultFreeFeatures.forEach(f => console.log(`   - ${f}`));
    
    // Check if any default features are missing from database
    const missingFeatures = defaultFreeFeatures.filter(featureId => {
      const searchText = featureId.toLowerCase().replace('-', ' ');
      return !freePlan.features.some(f => 
        f.text.toLowerCase().includes(searchText)
      );
    });
    
    if (missingFeatures.length > 0) {
      console.warn(`\n⚠️  Missing default free features in database: ${missingFeatures.length}`);
      missingFeatures.forEach(f => console.log(`   - ${f}`));
      console.log('\n   Users may not have access to these features even though they should.');
    } else {
      console.log('\n✅ All default free features are covered in database configuration.\n');
    }
    
    // 5. Check user assignments
    console.log('5. Checking user assignments...');
    const users = await prisma.user.findMany({
      where: {
        planId: freePlan.id
      },
      take: 5
    });
    
    console.log(`   ${users.length} users assigned to Free plan (sample):`);
    users.forEach(u => console.log(`   - ${u.email} (${u.role})`));
    
    const totalUsers = await prisma.user.count();
    const usersWithoutPlan = await prisma.user.count({
      where: { planId: null }
    });
    
    console.log(`\n   Total users: ${totalUsers}`);
    console.log(`   Users without any plan: ${usersWithoutPlan}`);
    if (usersWithoutPlan > 0) {
      console.warn('   ⚠️  Some users have no plan assigned!');
    }
    
    // 6. Test feature access logic
    console.log('\n6. Testing feature access logic...');
    const testUserId = users[0]?.id;
    if (testUserId) {
      console.log(`   Testing with user: ${users[0]?.email}`);
      
      // Simulate feature access check
      const testFeatures = ['ai-assistant', 'video-suite', 'voice-cloning'];
      
      for (const featureId of testFeatures) {
        const hasAccess = await checkFeatureAccess(testUserId, featureId, freePlan);
        console.log(`   - ${featureId}: ${hasAccess ? '✅ Access' : '❌ No access'}`);
      }
    } else {
      console.log('   No users on Free plan to test with.');
    }
    
    // 7. Check feature keyword matching
    console.log('\n7. Checking feature keyword matching...');
    console.log('   Feature access uses keyword matching:');
    console.log('   Example: "ai-assistant" matches "AI Assistant" in plan features');
    
    // Test matching
    const testCases = [
      { featureId: 'ai-assistant', searchText: 'ai assistant' },
      { featureId: 'video-suite', searchText: 'video suite' },
      { featureId: 'media-library', searchText: 'media library' }
    ];
    
    testCases.forEach(test => {
      const matches = freePlan.features.some(f => 
        f.text.toLowerCase().includes(test.searchText)
      );
      console.log(`   - "${test.featureId}" matching "${test.searchText}": ${matches ? '✅' : '❌'}`);
    });
    
    // Summary
    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log('====================');
    
    if (freePlan.features.length === 0) {
      console.log('❌ PRIMARY ISSUE: Free plan has NO features configured.');
      console.log('   SOLUTION: Add features to Free plan in admin panel.');
    } else if (missingFeatures.length > 0) {
      console.log('⚠️  ISSUE: Some default free features missing from database.');
      console.log('   SOLUTION: Add missing features to Free plan.');
    } else {
      console.log('✅ Free plan configuration looks correct.');
      console.log('   If features still not working, check:');
      console.log('   1. Database connectivity in production');
      console.log('   2. Feature access function logs');
      console.log('   3. User plan assignments');
    }
    
    console.log('\n💡 QUICK FIX:');
    console.log('   Navigate to /chin/dashboard/plans');
    console.log('   Edit the "Free" plan');
    console.log('   Add these features (one per line):');
    defaultFreeFeatures.forEach(f => console.log(`   - ${f.replace('-', ' ').toUpperCase()}`));
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    if (error.message.includes('Can\'t reach database server')) {
      console.error('\n💡 Database connection issue.');
      console.error('   The app cannot check features without database access.');
      console.error('   Check DATABASE_URL and ensure database is running.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function checkFeatureAccess(userId, featureId, freePlan) {
  // Simplified version of actual feature access logic
  const featureText = featureId.toLowerCase().replace('-', ' ');
  
  return freePlan.features.some(f => 
    f.text.toLowerCase().includes(featureText)
  );
}

main().catch(console.error);