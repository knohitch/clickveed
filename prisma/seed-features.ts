/**
 * Feature Seeding Script
 * Seeds the database with feature definitions and plan-feature relationships
 * 
 * Run with: npx tsx prisma/seed-features.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// All available features in the system
const FEATURES = [
  { featureId: 'ai-assistant', displayName: 'AI Assistant', category: 'content' },
  { featureId: 'creative-assistant', displayName: 'Creative Assistant', category: 'content' },
  { featureId: 'topic-researcher', displayName: 'Topic Researcher', category: 'content' },
  { featureId: 'thumbnail-tester', displayName: 'Thumbnail Tester', category: 'content' },
  { featureId: 'video-suite', displayName: 'Video Suite', category: 'video' },
  { featureId: 'video-pipeline', displayName: 'Video Pipeline', category: 'video' },
  { featureId: 'video-editor', displayName: 'Video Editor', category: 'video' },
  { featureId: 'magic-clips', displayName: 'Magic Clips', category: 'video' },
  { featureId: 'script-generator', displayName: 'Script Generator', category: 'content' },
  { featureId: 'voice-over', displayName: 'Voice Over', category: 'audio' },
  { featureId: 'image-to-video', displayName: 'Image to Video', category: 'video' },
  { featureId: 'voice-cloning', displayName: 'Voice Cloning', category: 'audio' },
  { featureId: 'video-from-url', displayName: 'Video from URL', category: 'content' },
  { featureId: 'stock-media', displayName: 'Stock Media Library', category: 'media' },
  { featureId: 'persona-studio', displayName: 'Persona Avatar Studio', category: 'video' },
  { featureId: 'ai-image-generator', displayName: 'AI Image Generator', category: 'media' },
  { featureId: 'flux-pro', displayName: 'Flux Pro Editor', category: 'media' },
  { featureId: 'background-remover', displayName: 'Background Remover', category: 'media' },
  { featureId: 'ai-agents', displayName: 'AI Agent Builder', category: 'automation' },
  { featureId: 'n8n-integrations', displayName: 'N8n/Make Integrations', category: 'automation' },
  { featureId: 'social-analytics', displayName: 'Social Analytics', category: 'social' },
  { featureId: 'social-scheduler', displayName: 'Social Scheduler', category: 'social' },
  { featureId: 'social-integrations', displayName: 'Social Integrations', category: 'social' },
  { featureId: 'media-library', displayName: 'Media Library', category: 'media' },
  { featureId: 'profile-settings', displayName: 'Profile Settings', category: 'settings' },
  { featureId: 'brand-kit', displayName: 'Brand Kit', category: 'settings' },
];

// Plan configurations with their features
const PLANS = [
  {
    id: 'plan_free',
    name: 'Free',
    description: 'Get started with basic video creation tools',
    priceMonthly: 0,
    priceQuarterly: 0,
    priceYearly: 0,
    featureTier: 'free',
    features: [
      'ai-assistant',
      'creative-assistant',
      'social-integrations',
      'media-library',
      'profile-settings',
      'video-suite',
      'video-editor',
      'video-pipeline',
      'script-generator',
      'video-from-url',
      'topic-researcher',
    ],
  },
  {
    id: 'plan_starter',
    name: 'Starter',
    description: 'Perfect for content creators getting started',
    priceMonthly: 19,
    priceQuarterly: 49,
    priceYearly: 149,
    featureTier: 'starter',
    features: [
      // All free features
      'ai-assistant',
      'creative-assistant',
      'social-integrations',
      'media-library',
      'profile-settings',
      'video-suite',
      'video-editor',
      'video-pipeline',
      'script-generator',
      'video-from-url',
      'topic-researcher',
      // Starter features
      'stock-media',
      'ai-image-generator',
      'background-remover',
      'social-analytics',
      'brand-kit',
    ],
  },
  {
    id: 'plan_professional',
    name: 'Professional',
    description: 'Advanced tools for professional creators',
    priceMonthly: 49,
    priceQuarterly: 129,
    priceYearly: 399,
    featureTier: 'professional',
    features: [
      // All starter features
      'ai-assistant',
      'creative-assistant',
      'social-integrations',
      'media-library',
      'profile-settings',
      'video-suite',
      'video-editor',
      'video-pipeline',
      'script-generator',
      'video-from-url',
      'topic-researcher',
      'stock-media',
      'ai-image-generator',
      'background-remover',
      'social-analytics',
      'brand-kit',
      // Professional features
      'thumbnail-tester',
      'magic-clips',
      'voice-over',
      'image-to-video',
      'persona-studio',
      'flux-pro',
      'ai-agents',
      'social-scheduler',
    ],
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise',
    description: 'Full access to all features for teams and agencies',
    priceMonthly: 99,
    priceQuarterly: 249,
    priceYearly: 799,
    featureTier: 'enterprise',
    features: [
      // All professional features
      'ai-assistant',
      'creative-assistant',
      'social-integrations',
      'media-library',
      'profile-settings',
      'video-suite',
      'video-editor',
      'video-pipeline',
      'script-generator',
      'video-from-url',
      'topic-researcher',
      'stock-media',
      'ai-image-generator',
      'background-remover',
      'social-analytics',
      'brand-kit',
      'thumbnail-tester',
      'magic-clips',
      'voice-over',
      'image-to-video',
      'persona-studio',
      'flux-pro',
      'ai-agents',
      'social-scheduler',
      // Enterprise features
      'voice-cloning',
      'n8n-integrations',
    ],
  },
];

async function seedFeatures() {
  console.log('🌱 Seeding features and plans...\n');

  // 1. Create all feature definitions
  console.log('📦 Creating feature definitions...');
  for (const feature of FEATURES) {
    await prisma.featureDefinition.upsert({
      where: { featureId: feature.featureId },
      create: {
        featureId: feature.featureId,
        displayName: feature.displayName,
        category: feature.category,
        isActive: true,
      },
      update: {
        displayName: feature.displayName,
        category: feature.category,
      },
    });
    console.log(`  ✅ Feature: ${feature.featureId}`);
  }

  // 2. Create/update all plans
  console.log('\n📋 Creating plans...');
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      create: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceQuarterly: plan.priceQuarterly,
        priceYearly: plan.priceYearly,
        featureTier: plan.featureTier,
      },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceQuarterly: plan.priceQuarterly,
        priceYearly: plan.priceYearly,
        featureTier: plan.featureTier,
      },
    });
    console.log(`  ✅ Plan: ${plan.name}`);

    // 3. Add features to plan
    console.log(`     Adding ${plan.features.length} features...`);
    
    // First, remove existing feature access for this plan
    await prisma.planFeatureAccess.deleteMany({
      where: { planId: plan.id },
    });
    
    // Then add all features
    for (const featureId of plan.features) {
      try {
        await prisma.planFeatureAccess.create({
          data: {
            planId: plan.id,
            featureId: featureId,
          },
        });
      } catch (error) {
        // Feature might not exist, skip
        console.log(`     ⚠️ Could not add feature ${featureId} to ${plan.name}`);
      }
    }
    console.log(`     ✅ Added ${plan.features.length} features to ${plan.name}`);
  }

  // 4. Verify the seeding
  console.log('\n📊 Verification:');
  const featureCount = await prisma.featureDefinition.count();
  const planCount = await prisma.plan.count();
  const accessCount = await prisma.planFeatureAccess.count();
  
  console.log(`  - Features: ${featureCount}`);
  console.log(`  - Plans: ${planCount}`);
  console.log(`  - Plan-Feature relationships: ${accessCount}`);

  console.log('\n✅ Seeding completed successfully!');
}

// Run the seeding
seedFeatures()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
