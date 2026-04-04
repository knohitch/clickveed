'use server';

/**
 * CENTRALIZED FEATURE ACCESS SERVICE
 * 
 * This is the SINGLE SOURCE OF TRUTH for feature access validation.
 * All feature access checks must go through this function.
 * 
 * Key principles:
 * 1. Admin-controlled database features ALWAYS take precedence
 * 2. If database features exist, use them (not hardcoded tiers)
 * 3. Only fall back to tier-based logic if no database features exist
 * 4. Feature access is NEVER blocked by subscription/payment status
 */

import prisma from '@/server/prisma';
import { auth } from '@/auth';
import type { FeatureAccess } from '@/lib/feature-access';
import { checkFeatureAccess, getFeatureDisplayName } from '@/lib/feature-access';
import { ALWAYS_ACCESSIBLE_FEATURES, matchFeatureKeywords } from '@/lib/feature-config';

async function resolveEffectiveUserId(requestedUserId: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session.user.role || '');
  if (!isAdmin && session.user.id !== requestedUserId) {
    throw new Error('Forbidden');
  }

  return isAdmin ? requestedUserId : session.user.id;
}

/**
 * Check if a user has access to a specific feature.
 * This is the centralized function that should be used everywhere.
 * 
 * @param userId - The user ID to check
 * @param featureId - The feature ID to check access for (e.g., 'voice-cloning', 'magic-clips')
 * @returns Promise<FeatureAccess> - Access result
 */
export async function hasFeatureAccess(userId: string, featureId: string): Promise<FeatureAccess> {
  const effectiveUserId = await resolveEffectiveUserId(userId);

  try {
    // Fetch user with their plan and plan features
    const user = await prisma.user.findUnique({
      where: { id: effectiveUserId },
      include: {
        plan: {
          include: {
            features: true
          }
        }
      }
    });

    if (!user) {
      console.error('[FeatureAccess] User not found:', effectiveUserId);
      return {
        canAccess: false,
        requiresUpgrade: true,
        featureName: getFeatureDisplayName(featureId),
      };
    }

    // Priority 1: Check if user has a plan with database features configured by admin
    if (user.plan && user.plan.features && user.plan.features.length > 0) {
      return checkAgainstDatabaseFeatures(user.plan.features, featureId);
    }

    // Priority 2: Fall back to tier-based check using plan.featureTier
    // This is used when admin hasn't configured explicit features for the plan
    const planName = user.plan?.name || null;
    const featureTier = user.plan?.featureTier || 'free';
    
    console.log('[FeatureAccess] No database features found, using tier-based check:', {
      userId: effectiveUserId,
      featureId,
      planName,
      featureTier
    });

    return checkFeatureAccess(planName, featureId, featureTier);
  } catch (error) {
    console.error('[FeatureAccess] Error checking feature access:', error);
    // Fail safely - deny access if there's an error
    return {
      canAccess: false,
      requiresUpgrade: true,
      featureName: getFeatureDisplayName(featureId),
    };
  }
}

/**
 * Check feature access against database-configured plan features.
 * This is the PRIORITY method that respects admin control.
 */
function checkAgainstDatabaseFeatures(planFeatures: any[], featureId: string): FeatureAccess {
  if ((ALWAYS_ACCESSIBLE_FEATURES as readonly string[]).includes(featureId)) {
    return {
      canAccess: true,
      requiresUpgrade: false,
      featureName: getFeatureDisplayName(featureId),
    };
  }

  // Check if the user's plan includes this specific feature
  // This is based on the plan features defined by the admin in the database
  const hasFeature = planFeatures.some(feature => {
    const featureText = feature.text.toLowerCase();
    const searchId = featureId.toLowerCase().replace('-', ' ');
    
    // Direct text matching or keyword matching
    return featureText.includes(searchId) || 
           featureText.includes(getFeatureDisplayName(featureId).toLowerCase()) ||
           matchFeatureKeywords(featureText, featureId);
  });

  console.log('[FeatureAccess] Database feature check:', {
    featureId,
    hasFeature,
    planFeatures: planFeatures.map(f => f.text)
  });

  return {
    canAccess: hasFeature,
    requiresUpgrade: !hasFeature,
    featureName: getFeatureDisplayName(featureId),
  };
}

/**
 * Validate feature access in server actions and API routes.
 * This function throws an error if the user doesn't have access.
 * Use this in server actions that need to enforce feature access.
 * 
 * @param userId - The user ID to validate
 * @param featureId - The feature ID to validate
 * @throws Error if user doesn't have access
 */
export async function requireFeatureAccess(userId: string, featureId: string): Promise<void> {
  const access = await hasFeatureAccess(userId, featureId);
  
  if (!access.canAccess) {
    throw new Error(
      `This feature requires a paid plan. ${access.featureName} is not available in your current plan.`
    );
  }
}
