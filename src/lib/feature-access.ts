/**
 * Feature Access - Client-safe version
 * This file can be safely imported by client components
 * It does NOT import prisma or any server-only modules
 */

import {
  getFeatureDisplayName,
  ALWAYS_ACCESSIBLE_FEATURES,
  DEFAULT_FREE_PLAN_FEATURES,
  DEFAULT_STARTER_PLAN_FEATURES,
  DEFAULT_PRO_PLAN_FEATURES,
  DEFAULT_ENTERPRISE_PLAN_FEATURES,
  FEATURE_MINIMUM_PLAN
} from '@/lib/feature-config';

export { getFeatureDisplayName };

export interface FeatureAccess {
  canAccess: boolean;
  requiresUpgrade: boolean;
  featureName: string;
}

// Feature tier definitions - these are the actual tiers that determine access
export type FeatureTier = 'free' | 'starter' | 'professional' | 'enterprise';

/**
 * Get features available for a specific tier (synchronous - uses defaults only)
 */
export function getFeaturesForTier(tier: FeatureTier): string[] {
  // Fallback to default features (database lookup removed for sync usage)
  switch (tier) {
    case 'enterprise':
      return [...DEFAULT_ENTERPRISE_PLAN_FEATURES];
    case 'professional':
      return [...DEFAULT_PRO_PLAN_FEATURES];
    case 'starter':
      return [...DEFAULT_STARTER_PLAN_FEATURES];
    case 'free':
    default:
      return [...DEFAULT_FREE_PLAN_FEATURES];
  }
}

/**
 * Normalize a feature tier string to a valid FeatureTier
 */
function normalizeTier(tier: string | null | undefined): FeatureTier {
  if (!tier) return 'free';
  const normalized = tier.toLowerCase().trim();
  if (['enterprise', 'ultimate'].includes(normalized)) return 'enterprise';
  if (['professional', 'pro'].includes(normalized)) return 'professional';
  if (['starter', 'basic'].includes(normalized)) return 'starter';
  return 'free';
}

/**
 * Check feature access based on plan's featureTier or planName (fallback)
 *
 * @param planName - The plan name (for backward compatibility)
 * @param featureId - The feature to check access for
 * @param featureTier - Optional explicit featureTier from plan.featureTier (takes priority)
 */
export function checkFeatureAccess(
  planName: string | null,
  featureId: string,
  featureTier?: string | null
): FeatureAccess {
  // Always allow basic features for all users
  if ((ALWAYS_ACCESSIBLE_FEATURES as readonly string[]).includes(featureId)) {
    return {
      canAccess: true,
      requiresUpgrade: false,
      featureName: getFeatureDisplayName(featureId),
    };
  }

  // Determine the effective tier:
  // 1. If explicit featureTier is provided (from plan.featureTier), use it
  // 2. Otherwise, try to interpret planName as a tier
  // 3. Fall back to 'free'
  let effectiveTier: FeatureTier;

  if (featureTier) {
    // Explicit tier provided (from plan.featureTier)
    effectiveTier = normalizeTier(featureTier);
  } else if (planName) {
    const normalized = planName.toLowerCase();

    // Check if plan name directly matches a tier
    if (['free', 'starter', 'professional', 'enterprise'].includes(normalized)) {
      effectiveTier = normalized as FeatureTier;
    } else {
      // Try to infer tier from plan name for backward compatibility
      if (normalized.includes('enterprise') || normalized.includes('ultimate')) {
        effectiveTier = 'enterprise';
      } else if (normalized.includes('professional') || normalized.includes('pro')) {
        effectiveTier = 'professional';
      } else if (normalized.includes('starter') || normalized.includes('basic')) {
        effectiveTier = 'starter';
      } else {
        effectiveTier = 'free';
      }
    }
  } else {
    // No plan info, default to free
    effectiveTier = 'free';
  }

  const availableFeatures = getFeaturesForTier(effectiveTier);
  const canAccess = availableFeatures.includes(featureId);

  return {
    canAccess,
    requiresUpgrade: !canAccess,
    featureName: getFeatureDisplayName(featureId),
  };
}

/**
 * Get the minimum plan required for a feature
 */
export function getMinimumPlanForFeature(featureId: string): string {
  // Enterprise-only features
  const enterpriseFeatures = ['voice-cloning', 'n8n-integrations'];
  if (enterpriseFeatures.includes(featureId)) {
    return 'Enterprise';
  }

  // Professional-only features
  const proFeatures = [
    'thumbnail-tester', 'magic-clips', 'voice-over',
    'image-to-video', 'persona-studio', 'flux-pro',
    'ai-agents', 'social-scheduler'
  ];
  if (proFeatures.includes(featureId)) {
    return 'Professional';
  }

  // Starter-only features
  const starterFeatures = [
    'stock-media', 'ai-image-generator', 'background-remover',
    'social-analytics', 'brand-kit'
  ];
  if (starterFeatures.includes(featureId)) {
    return 'Starter';
  }

  // Free features (including video tools)
  return 'Free';
}
