'use server';

/**
 * Feature Access - Server-side version
 * This file can ONLY be used in server components and server actions
 * 
 * DEPRECATED: This file now re-exports from the centralized feature-access-service.ts
 * All feature access logic has been consolidated to ensure admin control takes precedence.
 * 
 * Use hasFeatureAccess(userId, featureId) for checking access
 * Use requireFeatureAccess(userId, featureId) for enforcing access in server actions
 */

import { hasFeatureAccess, requireFeatureAccess } from './feature-access-service';
import type { FeatureAccess } from '@/lib/feature-access';
import type { Plan, PlanFeature } from '@prisma/client';
import prisma from '@/server/prisma';
import { checkFeatureAccess } from '@/lib/feature-access';
import { getFeatureDisplayName, matchFeatureKeywords } from '@/lib/feature-config';

type PlanWithFeatures = Plan & { features: PlanFeature[] };

// Re-export the centralized functions for backward compatibility
export { hasFeatureAccess, requireFeatureAccess };

/**
 * Legacy function - DEPRECATED
 * Use hasFeatureAccess(userId, featureId) instead
 * 
 * Dynamic feature access based on plan features stored in database
 * This allows admins to create any plans with custom features
 * Use this async version when you have the full plan object with features
 */
export async function checkFeatureAccessWithPlan(
  userPlan: PlanWithFeatures | null, 
  featureId: string
): Promise<FeatureAccess> {
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
  
  // If no plan, use default free features as fallback
  if (!userPlan) {
    const freeFeatures = [
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
 * Legacy function - DEPRECATED
 * Use hasFeatureAccess(userId, featureId) instead
 * 
 * Server-side helper to check user's current plan and feature access
 * This fetches the user's plan from the database
 */
export async function checkUserFeatureAccess(userId: string, featureId: string): Promise<FeatureAccess> {
   // Use the centralized service
   return hasFeatureAccess(userId, featureId);
}
