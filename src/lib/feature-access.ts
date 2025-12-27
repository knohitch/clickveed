/**
 * Feature Access - Client-safe version
 * This file can be safely imported by client components
 * It does NOT import prisma or any server-only modules
 */

export interface FeatureAccess {
  canAccess: boolean;
  requiresUpgrade: boolean;
  featureName: string;
}

function getFeatureDisplayName(featureId: string): string {
  const displayNames: Record<string, string> = {
    'ai-assistant': 'AI Assistant',
    'creative-assistant': 'Creative Assistant',
    'topic-researcher': 'Topic Researcher',
    'thumbnail-tester': 'Thumbnail Tester',
    'video-suite': 'Video Suite',
    'video-pipeline': 'Video Pipeline',
    'video-editor': 'Video Editor',
    'magic-clips': 'Magic Clips',
    'script-generator': 'Script Generator',
    'voice-over': 'Voice Over',
    'image-to-video': 'Image to Video',
    'voice-cloning': 'Voice Cloning',
    'video-from-url': 'Video from URL',
    'stock-media': 'Stock Media Library',
    'persona-studio': 'Persona Avatar Studio',
    'ai-image-generator': 'AI Image Generator',
    'flux-pro': 'Flux Pro Editor',
    'background-remover': 'Background Remover',
    'ai-agents': 'AI Agent Builder',
    'n8n-integrations': 'N8n/Make Integrations',
    'social-analytics': 'Social Analytics',
    'social-scheduler': 'Social Scheduler',
    'social-integrations': 'Social Integrations',
    'media-library': 'Media Library',
    'profile-settings': 'Profile Settings',
    'brand-kit': 'Brand Kit',
  };
  
  return displayNames[featureId] || featureId;
}

// Feature tier definitions - these are the actual tiers that determine access
export type FeatureTier = 'free' | 'starter' | 'professional' | 'enterprise';

// Free plan features - expanded to allow basic video creation
const freePlanFeatures = [
  'ai-assistant',
  'creative-assistant',
  'social-integrations',
  'video-suite',
  'video-pipeline',
  'script-generator',
  'stock-media',
  'ai-image-generator',
  'background-remover',
  'media-library',
  'profile-settings',
];

// Starter plan features
const starterPlanFeatures = [
  ...freePlanFeatures,
  'topic-researcher',
  'video-editor',
  'video-from-url',
  'social-analytics',
  'brand-kit',
];

// Professional plan features
const proPlanFeatures = [
  ...starterPlanFeatures,
  'thumbnail-tester',
  'magic-clips',
  'voice-over',
  'image-to-video',
  'persona-studio',
  'flux-pro',
  'ai-agents',
  'social-scheduler',
];

// Enterprise plan features (all features)
const enterprisePlanFeatures = [
  ...proPlanFeatures,
  'voice-cloning',
  'n8n-integrations',
];

/**
 * Get features available for a specific tier
 */
function getFeaturesForTier(tier: FeatureTier): string[] {
  switch (tier) {
    case 'enterprise':
      return enterprisePlanFeatures;
    case 'professional':
      return proPlanFeatures;
    case 'starter':
      return starterPlanFeatures;
    case 'free':
    default:
      return freePlanFeatures;
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
 * @param planNameOrTier - Either the plan name (for backward compatibility) or the featureTier
 * @param featureId - The feature to check access for
 * @param featureTier - Optional explicit featureTier (takes priority over planNameOrTier)
 */
export function checkFeatureAccess(
  planNameOrTier: string | null,
  featureId: string,
  featureTier?: string | null
): FeatureAccess {
  // Always allow basic features for all users
  const alwaysAccessibleFeatures = [
    'profile-settings',
    'media-library',
  ];

  if (alwaysAccessibleFeatures.includes(featureId)) {
    return {
      canAccess: true,
      requiresUpgrade: false,
      featureName: getFeatureDisplayName(featureId),
    };
  }

  // Determine the effective tier:
  // 1. If explicit featureTier is provided, use it
  // 2. Otherwise, try to interpret planNameOrTier as a tier
  // 3. Fall back to inferring tier from plan name (backward compatibility)
  let effectiveTier: FeatureTier;

  if (featureTier) {
    // Explicit tier provided (from plan.featureTier)
    effectiveTier = normalizeTier(featureTier);
  } else {
    // Try to interpret the planNameOrTier
    const normalized = (planNameOrTier || 'free').toLowerCase();

    // Check if it's already a valid tier
    if (['free', 'starter', 'professional', 'enterprise'].includes(normalized)) {
      effectiveTier = normalized as FeatureTier;
    } else {
      // Fallback: try to infer tier from plan name for backward compatibility
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
    'topic-researcher', 'video-suite', 'video-pipeline',
    'video-editor', 'script-generator', 'video-from-url',
    'stock-media', 'ai-image-generator', 'background-remover',
    'social-analytics', 'brand-kit'
  ];
  if (starterFeatures.includes(featureId)) {
    return 'Starter';
  }
  
  // Free features
  return 'Free';
}
