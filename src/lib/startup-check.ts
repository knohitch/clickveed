'use server';

/**
 * Startup Health Check
 * Validates that all critical systems are properly configured
 */

import { validateAIEnvironment } from './ai/validate-env';
import { aiProviderManager } from './ai/provider-manager';
import { getUnsupportedConfiguredProviders } from './ai/provider-registry';
import prisma from '@/server/prisma';

export interface HealthCheckResult {
  ai: boolean;
  database: boolean;
  features: boolean;
  storage: boolean;
  overall: boolean;
  details: {
    aiProviders: number;
    featureCount: number;
    planCount: number;
    errors: string[];
    warnings: string[];
  };
}

export async function startupHealthCheck(): Promise<HealthCheckResult> {
  console.log('🏥 Running startup health check...\n');

  const results: HealthCheckResult = {
    ai: false,
    database: false,
    features: false,
    storage: false,
    overall: false,
    details: {
      aiProviders: 0,
      featureCount: 0,
      planCount: 0,
      errors: [],
      warnings: [],
    },
  };

  // 1. Check AI Providers
  try {
    let adminApiKeys: Record<string, string> = {};
    try {
      const { getAdminSettings } = await import('@/server/actions/admin-actions');
      const settings = await getAdminSettings();
      adminApiKeys = settings?.apiKeys || {};
    } catch {
      adminApiKeys = {};
    }

    const envValidation = validateAIEnvironment();
    const status = await aiProviderManager.getStatus();
    const healthyProviders = status.filter(
      (p: any) => p.enabled && p.hasApiKey && p.healthStatus === 'healthy'
    );
    
    results.details.aiProviders = healthyProviders.length;
    
    if (healthyProviders.length === 0) {
      results.details.errors.push('No healthy AI providers available');
      console.error('❌ No healthy AI providers available');
    } else {
      console.log(`✅ ${healthyProviders.length} AI provider(s) available`);
      results.ai = true;
    }
    
    if (envValidation.warnings.length > 0) {
      results.details.warnings.push(...envValidation.warnings);
    }

    const unsupportedConfigured = getUnsupportedConfiguredProviders(adminApiKeys);
    if (unsupportedConfigured.length > 0) {
      results.details.warnings.push(
        `Configured providers without runtime adapters: ${unsupportedConfigured.join(', ')}`
      );
      console.warn(
        `⚠️ Configured providers without runtime adapters: ${unsupportedConfigured.join(', ')}`
      );
    }
  } catch (error) {
    console.error('❌ AI validation failed:', error);
    results.details.errors.push(`AI validation failed: ${error}`);
  }

  // 2. Check Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection OK');
    results.database = true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    results.details.errors.push(`Database connection failed: ${error}`);
  }

  // 3. Check Features Setup
  try {
    const featureCount = await prisma.featureDefinition.count();
    const planCount = await prisma.plan.count();
    
    results.details.featureCount = featureCount;
    results.details.planCount = planCount;
    
    if (featureCount === 0 || planCount === 0) {
      results.details.warnings.push('Features/Plans not seeded. Run: npx tsx prisma/seed-features.ts');
      console.warn('⚠️  Features/Plans not seeded. Run: npx tsx prisma/seed-features.ts');
    } else {
      console.log(`✅ Features (${featureCount}) and Plans (${planCount}) configured`);
      results.features = true;
    }
  } catch (error) {
    console.error('❌ Feature check failed:', error);
    results.details.errors.push(`Feature check failed: ${error}`);
  }

  // 4. Check Storage (Wasabi)
  try {
    const hasWasabiConfig = !!(
      process.env.WASABI_ACCESS_KEY_ID &&
      process.env.WASABI_SECRET_ACCESS_KEY &&
      process.env.WASABI_BUCKET
    );
    
    if (hasWasabiConfig) {
      console.log('✅ Storage (Wasabi) configured');
      results.storage = true;
    } else {
      results.details.warnings.push('Wasabi storage not fully configured');
      console.warn('⚠️  Wasabi storage not fully configured');
    }
  } catch (error) {
    console.error('❌ Storage check failed:', error);
    results.details.errors.push(`Storage check failed: ${error}`);
  }

  // Calculate overall health
  results.overall = results.ai && results.database;

  console.log('\n🏁 Startup check complete');
  console.log(`   AI: ${results.ai ? '✅' : '❌'}`);
  console.log(`   Database: ${results.database ? '✅' : '❌'}`);
  console.log(`   Features: ${results.features ? '✅' : '⚠️'}`);
  console.log(`   Storage: ${results.storage ? '✅' : '⚠️'}`);
  console.log(`   Overall: ${results.overall ? '✅ HEALTHY' : '❌ UNHEALTHY'}\n`);

  if (!results.overall) {
    console.error('⚠️  Some health checks failed. Application may not function correctly.');
    if (results.details.errors.length > 0) {
      console.error('Errors:');
      results.details.errors.forEach(e => console.error(`  - ${e}`));
    }
  }

  return results;
}

/**
 * Quick check for critical systems only
 */
export async function quickHealthCheck(): Promise<boolean> {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    
    // Check at least one AI provider
    const status = await aiProviderManager.getStatus();
    const hasProvider = status.some((p: any) => p.enabled && p.hasApiKey);
    
    return hasProvider;
  } catch (error) {
    console.error('[QuickHealthCheck] Failed:', error);
    return false;
  }
}
