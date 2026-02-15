'use server';

/**
 * Feature Access Check Utility
 * Centralized feature access checking with database support
 */

/// <reference types="node" />

import prisma from '@/server/prisma';
import { getFeatureDisplayName, ALWAYS_ACCESSIBLE_FEATURES } from '@/lib/feature-config';

// Type definitions for Prisma results
interface FeatureAccessRecord {
  feature: {
    featureId: string;
    displayName: string;
    category: string;
  };
}

interface PlanFeatureRecord {
  text: string;
}

interface PlanWithFeatures {
  id: string;
  name: string;
  featureTier: string;
  description: string;
  featureAccess: FeatureAccessRecord[];
  features: PlanFeatureRecord[];
}

export interface FeatureAccessResult {
  canAccess: boolean;
  requiresUpgrade: boolean;
  featureName: string;
  planName?: string;
  planId?: string;
}

/**
 * Check if a user has access to a specific feature
 * This checks the PlanFeatureAccess table in the database
 */
export async function checkFeatureAccess(
  userId: string, 
  featureId: string
): Promise<FeatureAccessResult> {
  try {
    console.log(`[FeatureAccess] Checking ${featureId} for user ${userId}`);
    
    // Always allow basic features
    if ((ALWAYS_ACCESSIBLE_FEATURES as readonly string[]).includes(featureId)) {
      return {
        canAccess: true,
        requiresUpgrade: false,
        featureName: getFeatureDisplayName(featureId),
      };
    }
    
    // Get user with plan and feature access
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        plan: {
          include: {
            featureAccess: {
              include: {
                feature: true,
              },
            },
            features: true, // Also include PlanFeature for backward compatibility
          },
        },
      },
    });

    if (!user) {
      console.error(`[FeatureAccess] User ${userId} not found`);
      return {
        canAccess: false,
        requiresUpgrade: true,
        featureName: getFeatureDisplayName(featureId),
      };
    }

    if (!user.plan) {
      console.log(`[FeatureAccess] User ${userId} has no plan assigned, checking free tier`);
      // Check if feature is in free tier
      const freePlan = await prisma.plan.findFirst({
        where: { 
          OR: [
            { name: { contains: 'free', mode: 'insensitive' } },
            { featureTier: 'free' }
          ]
        },
        include: {
          featureAccess: {
            include: {
              feature: true,
            },
          },
        },
      });
      
      if (freePlan) {
        const hasFeature = freePlan.featureAccess.some(
          (fa: { feature: { featureId: string } }) => fa.feature.featureId === featureId
        );
        
        return {
          canAccess: hasFeature,
          requiresUpgrade: !hasFeature,
          featureName: getFeatureDisplayName(featureId),
          planName: 'Free',
        };
      }
      
      return {
        canAccess: false,
        requiresUpgrade: true,
        featureName: getFeatureDisplayName(featureId),
      };
    }

    // Check PlanFeatureAccess (new system)
    const hasFeatureAccess = user.plan.featureAccess.some(
      (fa: { feature: { featureId: string } }) => fa.feature.featureId === featureId
    );
    
    // Also check PlanFeature (old system) for backward compatibility
    const hasLegacyFeature = user.plan.features.some((f: { text: string }) => {
      const featureText = f.text.toLowerCase();
      const searchId = featureId.toLowerCase().replace('-', ' ');
      return featureText.includes(searchId) || 
             featureText.includes(getFeatureDisplayName(featureId).toLowerCase());
    });
    
    const hasFeature = hasFeatureAccess || hasLegacyFeature;
    
    console.log(`[FeatureAccess] Result for ${featureId}:`, {
      userId,
      planId: user.plan.id,
      planName: user.plan.name,
      hasFeature,
      hasFeatureAccess,
      hasLegacyFeature,
    });

    return {
      canAccess: hasFeature,
      requiresUpgrade: !hasFeature,
      featureName: getFeatureDisplayName(featureId),
      planName: user.plan.name,
      planId: user.plan.id,
    };
  } catch (error) {
    console.error('[FeatureAccess] Error checking feature access:', error);
    return {
      canAccess: false,
      requiresUpgrade: true,
      featureName: getFeatureDisplayName(featureId),
    };
  }
}

/**
 * Get all features for a user's plan
 */
export async function getUserPlanFeatures(userId: string): Promise<string[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        plan: {
          include: {
            featureAccess: {
              include: {
                feature: true,
              },
            },
          },
        },
      },
    });

    if (!user?.plan) return [...ALWAYS_ACCESSIBLE_FEATURES];
    
    const features = user.plan.featureAccess.map((fa: { feature: { featureId: string } }) => fa.feature.featureId);
    return [...new Set([...ALWAYS_ACCESSIBLE_FEATURES, ...features])];
  } catch (error) {
    console.error('[getUserPlanFeatures] Error:', error);
    return [...ALWAYS_ACCESSIBLE_FEATURES];
  }
}

/**
 * Admin function to add feature to plan
 */
export async function addFeatureToPlan(
  planId: string,
  featureId: string
): Promise<boolean> {
  try {
    // First ensure the feature definition exists
    let feature = await prisma.featureDefinition.findUnique({
      where: { featureId },
    });

    if (!feature) {
      // Create the feature definition if it doesn't exist
      feature = await prisma.featureDefinition.create({
        data: {
          featureId,
          displayName: getFeatureDisplayName(featureId),
          category: 'other',
          isActive: true,
        },
      });
      console.log(`[addFeatureToPlan] Created feature definition: ${featureId}`);
    }

    // Add to plan (upsert to handle duplicates)
    await prisma.planFeatureAccess.upsert({
      where: {
        planId_featureId: {
          planId,
          featureId,
        },
      },
      create: {
        planId,
        featureId,
      },
      update: {},
    });

    console.log(`[addFeatureToPlan] Successfully added ${featureId} to plan ${planId}`);
    return true;
  } catch (error) {
    console.error('[addFeatureToPlan] Error:', error);
    return false;
  }
}

/**
 * Admin function to remove feature from plan
 */
export async function removeFeatureFromPlan(
  planId: string,
  featureId: string
): Promise<boolean> {
  try {
    await prisma.planFeatureAccess.delete({
      where: {
        planId_featureId: {
          planId,
          featureId,
        },
      },
    });

    console.log(`[removeFeatureFromPlan] Successfully removed ${featureId} from plan ${planId}`);
    return true;
  } catch (error) {
    console.error('[removeFeatureFromPlan] Error:', error);
    return false;
  }
}

/**
 * Get all plans with their features
 */
export async function getAllPlansWithFeatures() {
  try {
    const plans = await prisma.plan.findMany({
      include: {
        featureAccess: {
          include: {
            feature: true,
          },
        },
        features: true,
      },
      orderBy: {
        priceMonthly: 'asc',
      },
    });

    return plans.map((plan: any) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      featureTier: plan.featureTier,
      features: plan.featureAccess.map((fa: any) => ({
        featureId: fa.feature.featureId,
        displayName: fa.feature.displayName,
        category: fa.feature.category,
      })),
      legacyFeatures: plan.features.map((f: any) => f.text),
    }));
  } catch (error) {
    console.error('[getAllPlansWithFeatures] Error:', error);
    return [];
  }
}
