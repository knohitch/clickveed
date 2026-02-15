/**
 * AI Setup Validation Script
 * Run with: npx tsx scripts/validate-ai-setup.ts
 * 
 * This script validates that AI providers are properly configured
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateSetup() {
  console.log('🔍 Validating AI Provider Setup...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  
  console.log(`  OpenAI: ${openaiKey ? '✅ Configured' : '❌ Not set'}`);
  console.log(`  Gemini: ${geminiKey ? '✅ Configured' : '❌ Not set'}`);
  console.log(`  Anthropic: ${anthropicKey ? '✅ Configured' : '❌ Not set'}`);
  
  const configuredCount = [openaiKey, geminiKey, anthropicKey].filter(Boolean).length;
  console.log(`\n✅ ${configuredCount} provider(s) configured via environment variables`);
  
  if (configuredCount === 0) {
    console.error('\n❌ ERROR: No providers configured!');
    console.error('Please add at least one API key to your .env file:');
    console.error('  OPENAI_API_KEY=sk-...');
    console.error('  GOOGLE_AI_API_KEY=AIza...');
    console.error('  ANTHROPIC_API_KEY=sk-ant-...');
  }
  
  // Check database
  console.log('\n📊 Database Check:');
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('  Database connection: ✅ OK');
    
    // Check features
    const featureCount = await prisma.featureDefinition.count();
    const planCount = await prisma.plan.count();
    const accessCount = await prisma.planFeatureAccess.count();
    
    console.log(`  Features: ${featureCount}`);
    console.log(`  Plans: ${planCount}`);
    console.log(`  Plan-Feature relationships: ${accessCount}`);
    
    if (featureCount === 0 || planCount === 0) {
      console.warn('\n⚠️  Features/Plans not seeded!');
      console.warn('Run: npx tsx prisma/seed-features.ts');
    } else {
      console.log('\n✅ Database is properly configured');
    }
  } catch (error) {
    console.error('  Database connection: ❌ FAILED');
    console.error('  Error:', error);
  }
  
  // Check admin settings for API keys
  console.log('\n🔑 Admin Settings API Keys:');
  try {
    const apiKeySettings = await prisma.apiKey.findMany();
    if (apiKeySettings.length > 0) {
      apiKeySettings.forEach(key => {
        const hasValue = key.value && key.value.length > 0;
        console.log(`  ${key.name}: ${hasValue ? '✅ Set' : '❌ Empty'}`);
      });
    } else {
      console.log('  No API keys stored in database (using environment variables)');
    }
  } catch (error) {
    console.log('  Could not check admin API keys (table may not exist)');
  }
  
  // Test actual generation (optional)
  if (process.argv.includes('--test-generation')) {
    console.log('\n🧪 Testing AI Generation...');
    try {
      // Dynamic import to avoid issues if modules aren't available
      const { aiProviderManager } = await import('../src/lib/ai/provider-manager');
      
      const response = await aiProviderManager.generate('Say "Hello, World!"', {
        maxTokens: 20,
      });
      
      console.log(`  ✅ Success with ${response.provider} (${response.model})`);
      console.log(`  Response: "${response.text.substring(0, 50)}..."`);
    } catch (error) {
      console.error('  ❌ Generation test failed:', error);
    }
  }
  
  console.log('\n✅ Validation complete!');
}

validateSetup()
  .catch((e) => {
    console.error('❌ Validation failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
