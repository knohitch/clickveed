/**
 * Centralized feature configuration
 * This file serves as single source of truth for feature metadata
 * Eliminates duplication across multiple files
 */

export const FEATURE_CONFIG = {
  'ai-assistant': { displayName: 'AI Assistant', category: 'content' },
  'creative-assistant': { displayName: 'Creative Assistant', category: 'content' },
  'topic-researcher': { displayName: 'Topic Researcher', category: 'content' },
  'thumbnail-tester': { displayName: 'Thumbnail Tester', category: 'content' },
  'video-suite': { displayName: 'Video Suite', category: 'video' },
  'video-generator': { displayName: 'Video Generator', category: 'video' },
  'video-pipeline': { displayName: 'Video Pipeline', category: 'video' },
  'video-editor': { displayName: 'Video Editor', category: 'video' },
  'magic-clips': { displayName: 'Magic Clips', category: 'video' },
  'script-generator': { displayName: 'Script Generator', category: 'content' },
  'voice-over': { displayName: 'Voice Over', category: 'audio' },
  'image-to-video': { displayName: 'Image to Video', category: 'video' },
  'voice-cloning': { displayName: 'Voice Cloning', category: 'audio' },
  'video-from-url': { displayName: 'Video from URL', category: 'content' },
  'stock-media': { displayName: 'Stock Media Library', category: 'media' },
  'persona-studio': { displayName: 'Persona Avatar Studio', category: 'video' },
  'ai-image-generator': { displayName: 'AI Image Generator', category: 'media' },
  'flux-pro': { displayName: 'Flux Pro Editor', category: 'media' },
  'background-remover': { displayName: 'Background Remover', category: 'media' },
  'ai-agents': { displayName: 'AI Agent Builder', category: 'automation' },
  'n8n-integrations': { displayName: 'N8n/Make Integrations', category: 'automation' },
  'social-analytics': { displayName: 'Social Analytics', category: 'social' },
  'social-scheduler': { displayName: 'Social Scheduler', category: 'social' },
  'social-integrations': { displayName: 'Social Integrations', category: 'social' },
  'media-library': { displayName: 'Media Library', category: 'media' },
  'profile-settings': { displayName: 'Profile Settings', category: 'settings' },
  'brand-kit': { displayName: 'Brand Kit', category: 'settings' },
} as const;

export type FeatureId = keyof typeof FEATURE_CONFIG;

export function getFeatureDisplayName(featureId: string): string {
  return FEATURE_CONFIG[featureId as FeatureId]?.displayName || featureId;
}

export function getFeatureCategory(featureId: string): string {
  return FEATURE_CONFIG[featureId as FeatureId]?.category || 'other';
}

// Always accessible features (used across multiple files)
export const ALWAYS_ACCESSIBLE_FEATURES = [
  'profile-settings',
  'media-library',
] as const;

// Keyword matching for flexible feature detection
export const FEATURE_KEYWORD_MAP: Record<string, string[]> = {
  'video-suite': ['video', 'editing', 'creation'],
  'video-generator': ['video', 'generator', 'render', 'text to video'],
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
} as const;

export function matchFeatureKeywords(featureText: string, featureId: string): boolean {
  const keywords = FEATURE_KEYWORD_MAP[featureId] || [];
  return keywords.some(keyword => featureText.includes(keyword));
}

// Default free plan features (can be overridden by database)
// FREE TIER: Includes essential video creation tools to provide value
export const DEFAULT_FREE_PLAN_FEATURES = [
  'ai-assistant',
  'creative-assistant',
  'social-integrations',
  'media-library',
  'profile-settings',
  // Video tools for free users
  'video-suite',
  'video-generator',
  'video-editor',
  'video-pipeline',
  'script-generator',
  'video-from-url',
  'topic-researcher',
] as const;

export const DEFAULT_STARTER_PLAN_FEATURES = [
  ...DEFAULT_FREE_PLAN_FEATURES,
  'topic-researcher',
  'video-suite',
  'video-generator',
  'video-pipeline',
  'video-editor',
  'script-generator',
  'video-from-url',
  'stock-media',
  'ai-image-generator',
  'background-remover',
  'social-analytics',
  'brand-kit',
] as const;

export const DEFAULT_PRO_PLAN_FEATURES = [
  ...DEFAULT_STARTER_PLAN_FEATURES,
  'thumbnail-tester',
  'magic-clips',
  'voice-over',
  'image-to-video',
  'persona-studio',
  'flux-pro',
  'ai-agents',
  'social-scheduler',
] as const;

export const DEFAULT_ENTERPRISE_PLAN_FEATURES = [
  ...DEFAULT_PRO_PLAN_FEATURES,
  'voice-cloning',
  'n8n-integrations',
] as const;

// Minimum plan tiers for features - ALIGNED with DEFAULT_*_PLAN_FEATURES above
export const FEATURE_MINIMUM_PLAN: Record<string, string> = {
  // Enterprise-only features
  'voice-cloning': 'Enterprise',
  'n8n-integrations': 'Enterprise',

  // Professional features
  'thumbnail-tester': 'Professional',
  'magic-clips': 'Professional',
  'voice-over': 'Professional',
  'image-to-video': 'Professional',
  'persona-studio': 'Professional',
  'flux-pro': 'Professional',
  'ai-agents': 'Professional',
  'social-scheduler': 'Professional',

  // Starter features
  'stock-media': 'Starter',
  'ai-image-generator': 'Starter',
  'background-remover': 'Starter',
  'social-analytics': 'Starter',
  'brand-kit': 'Starter',

  // Free features (explicitly listed for clarity)
  'topic-researcher': 'Free',
  'video-suite': 'Free',
  'video-generator': 'Free',
  'video-pipeline': 'Free',
  'video-editor': 'Free',
  'script-generator': 'Free',
  'video-from-url': 'Free',

  // Free features (no entry needed - included by default)
  // 'ai-assistant': 'Free',
  // 'creative-assistant': 'Free',
  // 'social-integrations': 'Free',
  // 'media-library': 'Free',
  // 'profile-settings': 'Free',
} as const;
