import type { Plan, PlanFeature } from '@prisma/client';
import prisma from './prisma';

export interface FeatureAccess {
  canAccess: boolean;
  requiresUpgrade: boolean;
  featureName: string;
}

type PlanWithFeatures = Plan & { features: PlanFeature[] };

/**
 * Dynamic feature access based on plan features stored in database
 * This allows admins to create any plans with custom features
 */
export async function checkFeatureAccess(
  userPlan: PlanWithFeatures | null, 
  featureId: string
): Promise<FeatureAccess> {
  // Always allow basic features for all users
  const alwaysAccessibleFeatures = [
    'profile-settings',
    'media-library', // Basic media library access
  ];
  
  if (alwaysAccessibleFeatures.includes(featureId)) {
    return {
      canAccess: true,
      requiresUpgrade: false,
      featureName: getFeatureDisplayName(featureId),
    };
  }
  
  // If no plan or Free plan, check if feature is allowed
  if (!userPlan || userPlan.name.toLowerCase() === 'free') {
    const freeFeatures = [
      'ai-assistant',
      'creative-assistant',
      'social-integrations', // Basic integrations
    ];
    
    const canAccess = freeFeatures.includes(featureId);
    return {
      canAccess,
      requiresUpgrade: !canAccess,
      featureName: getFeatureDisplayName(featureId),
    };
  }
  
  // Check if the user's plan includes this specific feature
  // This is based on the plan features defined by the admin
  const hasFeature = userPlan.features.some(feature => {
    // Match feature text to feature ID (flexible matching)
    const featureText = feature.text.toLowerCase();
    const searchId = featureId.toLowerCase().replace('-', ' ');
    
    // Direct text matching or keyword matching
    return featureText.includes(searchId) || 
           featureText.includes(getFeatureDisplayName(featureId).toLowerCase()) ||
           matchFeatureKeywords(featureText, featureId);
  });
  
  return {
    canAccess: hasFeature,
    requiresUpgrade: !hasFeature,
    featureName: getFeatureDisplayName(featureId),
  };
}

/**
 * Match feature keywords for better detection
 */
function matchFeatureKeywords(featureText: string, featureId: string): boolean {
  const keywordMap: Record<string, string[]> = {
    'video-suite': ['video', 'editing', 'creation'],
    'ai-assistant': ['ai', 'assistant', 'chat'],
    'voice-cloning': ['voice', 'clone', 'cloning'],
    'background-remover': ['background', 'remove', 'remover'],
    'social-analytics': ['social', 'analytics', 'insights'],
    'social-scheduler': ['social', 'schedule', 'scheduling'],
    'magic-clips': ['magic', 'clips', 'highlights'],
    'script-generator': ['script', 'generator', 'writing'],
    'voice-over': ['voice', 'over', 'voiceover', 'narration'],
    'image-to-video': ['image', 'video', 'conversion'],
    'stock-media': ['stock', 'media', 'library'],
    'ai-agents': ['agent', 'automation', 'workflow'],
    'brand-kit': ['brand', 'kit', 'branding'],
  };
  
  const keywords = keywordMap[featureId] || [];
  return keywords.some(keyword => featureText.includes(keyword));
}

/**
 * Server-side helper to check user's current plan and feature access
 */
export async function checkUserFeatureAccess(userId: string, featureId: string): Promise<FeatureAccess> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        plan: {
          include: {
            features: true
          }
        }
      }
    });
    
    return await checkFeatureAccess(user?.plan || null, featureId);
  } catch (error) {
    console.error('Error checking feature access:', error);
    // Fail safely - deny access if there's an error
    return {
      canAccess: false,
      requiresUpgrade: true,
      featureName: getFeatureDisplayName(featureId),
    };
  }
}

/**
 * Sync version for client-side use (requires plan to be passed)
 */
export function checkFeatureAccessSync(userPlan: PlanWithFeatures | null, featureId: string): FeatureAccess {
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
  
  if (!userPlan || userPlan.name.toLowerCase() === 'free') {
    const freeFeatures = [
      'ai-assistant',
      'creative-assistant',
      'social-integrations',
    ];
    
    const canAccess = freeFeatures.includes(featureId);
    return {
      canAccess,
      requiresUpgrade: !canAccess,
      featureName: getFeatureDisplayName(featureId),
    };
  }
  
  const hasFeature = userPlan.features.some(feature => {
    const featureText = feature.text.toLowerCase();
    const searchId = featureId.toLowerCase().replace('-', ' ');
    
    return featureText.includes(searchId) || 
           featureText.includes(getFeatureDisplayName(featureId).toLowerCase()) ||
           matchFeatureKeywords(featureText, featureId);
  });
  
  return {
    canAccess: hasFeature,
    requiresUpgrade: !hasFeature,
    featureName: getFeatureDisplayName(featureId),
  };
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

// This function is no longer needed since we use dynamic plan features
// Admin can create any plan with any features, so there's no fixed minimum
