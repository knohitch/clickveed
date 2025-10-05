import type { Plan } from '@prisma/client';

export interface FeatureAccess {
  canAccess: boolean;
  requiresUpgrade: boolean;
  featureName: string;
}

// Define which features are available per plan
const PLAN_FEATURES = {
  'Free': {
    // AI Assistant
    'ai-assistant': true,
    'creative-assistant': true,
    'topic-researcher': false,
    'thumbnail-tester': false,
    
    // Video Suite
    'video-suite': false,
    'video-pipeline': false,
    'video-editor': false,
    'magic-clips': false,
    'script-generator': false,
    'voice-over': false,
    'image-to-video': false,
    'voice-cloning': false,
    'video-from-url': false,
    'stock-media': false,
    'persona-studio': false,
    
    // Image Editing
    'ai-image-generator': false,
    'flux-pro': false,
    'background-remover': false,
    
    // AI Agents
    'ai-agents': false,
    'n8n-integrations': false,
    
    // Social Suite
    'social-analytics': false,
    'social-scheduler': false,
    'social-integrations': true, // Basic integrations available for free
    
    // Media Management
    'media-library': true,
    
    // Settings
    'profile-settings': true,
    'brand-kit': false,
  },
  'Starter': {
    // AI Assistant
    'ai-assistant': true,
    'creative-assistant': true,
    'topic-researcher': true,
    'thumbnail-tester': false,
    
    // Video Suite
    'video-suite': true,
    'video-pipeline': true,
    'video-editor': true,
    'magic-clips': false,
    'script-generator': true,
    'voice-over': false,
    'image-to-video': false,
    'voice-cloning': false,
    'video-from-url': true,
    'stock-media': true,
    'persona-studio': false,
    
    // Image Editing
    'ai-image-generator': true,
    'flux-pro': false,
    'background-remover': true,
    
    // AI Agents
    'ai-agents': false,
    'n8n-integrations': false,
    
    // Social Suite
    'social-analytics': true,
    'social-scheduler': false,
    'social-integrations': true,
    
    // Media Management
    'media-library': true,
    
    // Settings
    'profile-settings': true,
    'brand-kit': true,
  },
  'Professional': {
    // AI Assistant
    'ai-assistant': true,
    'creative-assistant': true,
    'topic-researcher': true,
    'thumbnail-tester': true,
    
    // Video Suite
    'video-suite': true,
    'video-pipeline': true,
    'video-editor': true,
    'magic-clips': true,
    'script-generator': true,
    'voice-over': true,
    'image-to-video': true,
    'voice-cloning': false,
    'video-from-url': true,
    'stock-media': true,
    'persona-studio': true,
    
    // Image Editing
    'ai-image-generator': true,
    'flux-pro': true,
    'background-remover': true,
    
    // AI Agents
    'ai-agents': true,
    'n8n-integrations': false,
    
    // Social Suite
    'social-analytics': true,
    'social-scheduler': true,
    'social-integrations': true,
    
    // Media Management
    'media-library': true,
    
    // Settings
    'profile-settings': true,
    'brand-kit': true,
  },
  'Enterprise': {
    // All features available
    'ai-assistant': true,
    'creative-assistant': true,
    'topic-researcher': true,
    'thumbnail-tester': true,
    'video-suite': true,
    'video-pipeline': true,
    'video-editor': true,
    'magic-clips': true,
    'script-generator': true,
    'voice-over': true,
    'image-to-video': true,
    'voice-cloning': true,
    'video-from-url': true,
    'stock-media': true,
    'persona-studio': true,
    'ai-image-generator': true,
    'flux-pro': true,
    'background-remover': true,
    'ai-agents': true,
    'n8n-integrations': true,
    'social-analytics': true,
    'social-scheduler': true,
    'social-integrations': true,
    'media-library': true,
    'profile-settings': true,
    'brand-kit': true,
  },
};

// Fallback to Free plan if plan not found
function getPlanFeatures(planName: string | null) {
  return PLAN_FEATURES[planName as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.Free;
}

export function checkFeatureAccess(planName: string | null, featureId: string): FeatureAccess {
  const features = getPlanFeatures(planName);
  const canAccess = features[featureId as keyof typeof features] || false;
  
  return {
    canAccess,
    requiresUpgrade: !canAccess,
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

// Helper function to get the minimum plan required for a feature
export function getMinimumPlanForFeature(featureId: string): string {
  for (const [planName, features] of Object.entries(PLAN_FEATURES)) {
    if (features[featureId as keyof typeof features]) {
      return planName;
    }
  }
  return 'Enterprise'; // Default to highest tier if not found
}
