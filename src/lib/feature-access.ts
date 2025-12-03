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

/**
 * Simple sync version for client-side use with just plan name
 * This is a simpler check that works with plan names directly
 */
export function checkFeatureAccess(planName: string | null, featureId: string): FeatureAccess {
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
  
  // Free plan features
  const freePlanFeatures = [
    'ai-assistant',
    'creative-assistant',
    'social-integrations',
  ];
  
  // Starter plan features
  const starterPlanFeatures = [
    ...freePlanFeatures,
    'topic-researcher',
    'video-suite',
    'video-pipeline',
    'video-editor',
    'script-generator',
    'video-from-url',
    'stock-media',
    'ai-image-generator',
    'background-remover',
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
  
  // Determine which features are available based on plan name
  let availableFeatures: string[] = [];
  
  const normalizedPlanName = (planName || 'free').toLowerCase();
  
  if (normalizedPlanName.includes('enterprise') || normalizedPlanName.includes('ultimate')) {
    availableFeatures = enterprisePlanFeatures;
  } else if (normalizedPlanName.includes('professional') || normalizedPlanName.includes('pro')) {
    availableFeatures = proPlanFeatures;
  } else if (normalizedPlanName.includes('starter') || normalizedPlanName.includes('basic')) {
    availableFeatures = starterPlanFeatures;
  } else {
    availableFeatures = freePlanFeatures;
  }
  
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
