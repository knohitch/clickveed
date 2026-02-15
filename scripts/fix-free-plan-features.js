#!/usr/bin/env node

/**
 * Script to fix Free plan features by adding proper feature entries
 * that match the feature access system requirements.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// These are the features that should be available in the Free plan
// Based on src/lib/feature-config.ts DEFAULT_FREE_PLAN_FEATURES
const FREE_PLAN_FEATURES = [
  // Must match feature IDs from feature-config.ts
  'AI Assistant',           // matches 'ai-assistant'
  'Creative Assistant',     // matches 'creative-assistant'
  'Social Integrations',    // matches 'social-integrations'
  'Media Library',          // matches 'media-library'
  'Profile Settings',       // matches 'profile-settings'
  
  // Resource features (already in seed)
  '5 Video Exports / mo',
  '1,000 AI Credits',
  '2 GB Storage',
  'Standard Support',
];

async function main() {
  console.log('🛠️  Fixing Free Plan Features');
  console.log('=============================\n');
  
  try {
    // Find Free plan
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
      console.error('❌ Free plan not found! Creating one...');
      
      // Create Free plan if it doesn't exist
      const newFreePlan = await prisma.plan.create({
        data: {
          id: 'plan_free',
          name: 'Free',
          description: 'For users getting started. Access basic features and a limited amount of resources.',
          priceMonthly: 0,
          priceQuarterly: 0,
          priceYearly: 0,
          featureTier: 'free',
          videoExports: 5,
          aiCredits: 1000,
          storageGB: 2,
          features: {
            create: FREE_PLAN_FEATURES.map(text => ({ text }))
          }
        },
        include: {
          features: true
        }
      });
      
      console.log('✅ Created Free plan with features');
      console.log(`   Plan ID: ${newFreePlan.id}`);
      console.log(`   Features added: ${newFreePlan.features.length}`);
      return;
    }
    
    console.log(`✅ Found Free plan: "${freePlan.name}" (ID: ${freePlan.id})`);
    console.log(`   Current features: ${freePlan.features.length}`);
    
    // Check which features are missing
    const currentFeatureTexts = freePlan.features.map(f => f.text);
    const missingFeatures = FREE_PLAN_FEATURES.filter(feature => 
      !currentFeatureTexts.includes(feature)
    );
    
    if (missingFeatures.length === 0) {
      console.log('✅ Free plan already has all required features');
      console.log('\nCurrent features:');
      freePlan.features.forEach((f, i) => console.log(`   ${i+1}. ${f.text}`));
      return;
    }
    
    console.log(`⚠️  Missing ${missingFeatures.length} features:`);
    missingFeatures.forEach(f => console.log(`   - ${f}`));
    
    // Add missing features
    console.log('\n➕ Adding missing features...');
    
    for (const featureText of missingFeatures) {
      await prisma.planFeature.create({
        data: {
          text: featureText,
          planId: freePlan.id
        }
      });
      console.log(`   Added: ${featureText}`);
    }
    
    // Verify update
    const updatedPlan = await prisma.plan.findUnique({
      where: { id: freePlan.id },
      include: { features: true }
    });
    
    console.log('\n✅ Free plan updated successfully');
    console.log(`   Total features now: ${updatedPlan?.features.length}`);
    console.log('\nAll features:');
    updatedPlan?.features.forEach((f, i) => console.log(`   ${i+1}. ${f.text}`));
    
    // Test feature matching
    console.log('\n🔍 Testing feature matching:');
    const testCases = [
      { featureId: 'ai-assistant', expectedMatch: 'AI Assistant' },
      { featureId: 'creative-assistant', expectedMatch: 'Creative Assistant' },
      { featureId: 'media-library', expectedMatch: 'Media Library' },
      { featureId: 'profile-settings', expectedMatch: 'Profile Settings' },
    ];
    
    testCases.forEach(test => {
      const searchText = test.featureId.replace('-', ' ').toLowerCase();
      const hasMatch = updatedPlan?.features.some(f => 
        f.text.toLowerCase().includes(searchText)
      );
      console.log(`   ${test.featureId}: ${hasMatch ? '✅' : '❌'} (looks for "${searchText}" in "${test.expectedMatch}")`);
    });
    
    console.log('\n💡 IMPORTANT:');
    console.log('1. The feature access system uses keyword matching');
    console.log('2. "ai-assistant" looks for "ai assistant" in feature text');
    console.log('3. Make sure feature texts include the right keywords');
    console.log('4. Users may need to log out and back in for changes to take effect');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('Can\'t reach database server')) {
      console.error('\n💡 Manual fix required:');
      console.error('1. Navigate to /chin/dashboard/plans');
      console.error('2. Edit the "Free" plan');
      console.error('3. Add these features (one per line):');
      FREE_PLAN_FEATURES.forEach(f => console.error(`   - ${f}`));
      console.error('\n4. Save the plan');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);