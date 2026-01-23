#!/usr/bin/env node
/**
 * Fix duplicate plan features by removing duplicates, keeping only one copy per plan
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDuplicates() {
  console.log('🔍 Removing duplicate plan features...');
  
  // Get all plans
  const plans = await prisma.plan.findMany();
  
  for (const plan of plans) {
    console.log(`\nProcessing ${plan.name}...`);
    
    // Get all features for this plan
    const features = await prisma.planFeature.findMany({
      where: { planId: plan.id }
    });
    
    // Group by text
    const seen = new Set();
    const toDelete = [];
    
    for (const feature of features) {
      if (seen.has(feature.text)) {
        toDelete.push(feature.id);
      } else {
        seen.add(feature.text);
      }
    }
    
    // Delete duplicates
    if (toDelete.length > 0) {
      await prisma.planFeature.deleteMany({
        where: { id: { in: toDelete } }
      });
      console.log(`  Removed ${toDelete.length} duplicates`);
    } else {
      console.log('  No duplicates found');
    }
  }
  
  // Verify final counts
  console.log('\n✅ Final feature counts:');
  for (const plan of plans) {
    const count = await prisma.planFeature.count({
      where: { planId: plan.id }
    });
    console.log(`  ${plan.name}: ${count} features`);
  }
  
  await prisma.$disconnect();
  console.log('\n✅ Duplicate cleanup complete');
}

fixDuplicates().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});