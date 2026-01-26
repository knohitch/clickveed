'use server';

import prismaClient from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { FEATURE_CONFIG, DEFAULT_FREE_PLAN_FEATURES, DEFAULT_STARTER_PLAN_FEATURES, DEFAULT_PRO_PLAN_FEATURES, DEFAULT_ENTERPRISE_PLAN_FEATURES } from '@/lib/feature-config';

// Cast prisma to any to support new models before `prisma generate` is run
// After running `prisma generate`, you can remove this cast and use typed queries
const prisma = prismaClient as any;

export interface FeatureDefinitionData {
    id?: string;
    featureId: string;
    displayName: string;
    description?: string | null;
    category: string;
    isActive: boolean;
}

export interface PlanFeatureAccessData {
    planId: string;
    featureIds: string[];
}

/**
 * Get all feature definitions
 */
export async function getAllFeatures() {
    try {
        const features = await prisma.featureDefinition.findMany({
            orderBy: [{ category: 'asc' }, { displayName: 'asc' }],
            include: {
                planAccess: {
                    include: {
                        plan: {
                            select: { id: true, name: true }
                        }
                    }
                }
            }
        });
        return features;
    } catch (error) {
        console.error('[getAllFeatures] Error:', error);
        return [];
    }
}

/**
 * Get features for a specific plan
 */
export async function getPlanFeatures(planId: string): Promise<string[]> {
    try {
        const planFeatures = await prisma.planFeatureAccess.findMany({
            where: { planId },
            select: { featureId: true }
        });
        return planFeatures.map((pf: { featureId: string }) => pf.featureId);
    } catch (error) {
        console.error('[getPlanFeatures] Error:', error);
        return [];
    }
}

/**
 * Get all features that a user's plan has access to
 */
export async function getUserPlanFeatures(userId: string): Promise<string[]> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                plan: {
                    include: {
                        featureAccess: {
                            where: {
                                feature: { isActive: true }
                            },
                            select: { featureId: true }
                        }
                    }
                }
            }
        });

        if (!user?.plan) {
            // Return default free features if no plan
            return [...DEFAULT_FREE_PLAN_FEATURES];
        }

        const dbFeatures = user.plan.featureAccess.map((fa: { featureId: string }) => fa.featureId);

        // If no features in DB, fall back to hardcoded tier features
        if (dbFeatures.length === 0) {
            const tier = user.plan.featureTier?.toLowerCase() || 'free';
            switch (tier) {
                case 'enterprise':
                    return [...DEFAULT_ENTERPRISE_PLAN_FEATURES];
                case 'professional':
                case 'pro':
                    return [...DEFAULT_PRO_PLAN_FEATURES];
                case 'starter':
                    return [...DEFAULT_STARTER_PLAN_FEATURES];
                default:
                    return [...DEFAULT_FREE_PLAN_FEATURES];
            }
        }

        return dbFeatures;
    } catch (error) {
        console.error('[getUserPlanFeatures] Error:', error);
        return [...DEFAULT_FREE_PLAN_FEATURES];
    }
}

/**
 * Create or update a feature definition
 */
export async function upsertFeature(data: FeatureDefinitionData) {
    try {
        const feature = await prisma.featureDefinition.upsert({
            where: { featureId: data.featureId },
            update: {
                displayName: data.displayName,
                description: data.description,
                category: data.category,
                isActive: data.isActive,
            },
            create: {
                featureId: data.featureId,
                displayName: data.displayName,
                description: data.description,
                category: data.category,
                isActive: data.isActive,
            }
        });

        revalidatePath('/chin/dashboard/features');
        return { success: true, feature };
    } catch (error) {
        console.error('[upsertFeature] Error:', error);
        return { success: false, error: 'Failed to save feature' };
    }
}

/**
 * Delete a feature definition
 */
export async function deleteFeature(featureId: string) {
    try {
        await prisma.featureDefinition.delete({
            where: { featureId }
        });

        revalidatePath('/chin/dashboard/features');
        return { success: true };
    } catch (error) {
        console.error('[deleteFeature] Error:', error);
        return { success: false, error: 'Failed to delete feature' };
    }
}

/**
 * Update feature access for a plan
 */
export async function updatePlanFeatureAccess(planId: string, featureIds: string[]) {
    try {
        // Delete all existing access for this plan
        await prisma.planFeatureAccess.deleteMany({
            where: { planId }
        });

        // Create new access entries
        if (featureIds.length > 0) {
            await prisma.planFeatureAccess.createMany({
                data: featureIds.map(featureId => ({
                    planId,
                    featureId,
                }))
            });
        }

        revalidatePath('/chin/dashboard/features');
        revalidatePath('/chin/dashboard/plans');
        return { success: true };
    } catch (error) {
        console.error('[updatePlanFeatureAccess] Error:', error);
        return { success: false, error: 'Failed to update plan features' };
    }
}

/**
 * Seed default features from the feature config
 */
export async function seedDefaultFeatures() {
    try {
        const existingFeatures = await prisma.featureDefinition.count();

        if (existingFeatures > 0) {
            console.log('[seedDefaultFeatures] Features already exist, skipping seed');
            return { success: true, message: 'Features already exist' };
        }

        // Create feature definitions from FEATURE_CONFIG
        const featureEntries = Object.entries(FEATURE_CONFIG);

        for (const [featureId, config] of featureEntries) {
            await prisma.featureDefinition.create({
                data: {
                    featureId,
                    displayName: config.displayName,
                    category: config.category,
                    isActive: true,
                }
            });
        }

        // Now assign features to plans based on default tiers
        const plans = await prisma.plan.findMany();

        for (const plan of plans) {
            let featureIds: readonly string[] = [];
            const tier = plan.featureTier?.toLowerCase() || 'free';

            switch (tier) {
                case 'enterprise':
                    featureIds = DEFAULT_ENTERPRISE_PLAN_FEATURES;
                    break;
                case 'professional':
                case 'pro':
                    featureIds = DEFAULT_PRO_PLAN_FEATURES;
                    break;
                case 'starter':
                    featureIds = DEFAULT_STARTER_PLAN_FEATURES;
                    break;
                default:
                    featureIds = DEFAULT_FREE_PLAN_FEATURES;
            }

            // Create plan feature access entries
            for (const featureId of featureIds) {
                try {
                    await prisma.planFeatureAccess.create({
                        data: {
                            planId: plan.id,
                            featureId,
                        }
                    });
                } catch (e) {
                    // Ignore duplicate errors
                    console.log(`[seedDefaultFeatures] Skipping duplicate: ${plan.id} - ${featureId}`);
                }
            }
        }

        console.log('[seedDefaultFeatures] Successfully seeded default features');
        return { success: true, message: 'Successfully seeded default features' };
    } catch (error) {
        console.error('[seedDefaultFeatures] Error:', error);
        return { success: false, error: 'Failed to seed features' };
    }
}

/**
 * Check if a specific feature is accessible for a plan (from database)
 */
export async function checkPlanFeatureAccess(planId: string | null, featureId: string): Promise<boolean> {
    // Always allow these basic features
    const alwaysAccessible = ['profile-settings', 'media-library'];
    if (alwaysAccessible.includes(featureId)) {
        return true;
    }

    if (!planId) {
        // No plan - check if it's a free feature
        return DEFAULT_FREE_PLAN_FEATURES.includes(featureId as any);
    }

    try {
        // First check if we have any features in the database
        const featureCount = await prisma.featureDefinition.count();

        if (featureCount === 0) {
            // No features in DB, fall back to hardcoded
            const plan = await prisma.plan.findUnique({
                where: { id: planId },
                select: { featureTier: true }
            });

            const tier = plan?.featureTier?.toLowerCase() || 'free';
            let features: readonly string[] = [];

            switch (tier) {
                case 'enterprise':
                    features = DEFAULT_ENTERPRISE_PLAN_FEATURES;
                    break;
                case 'professional':
                case 'pro':
                    features = DEFAULT_PRO_PLAN_FEATURES;
                    break;
                case 'starter':
                    features = DEFAULT_STARTER_PLAN_FEATURES;
                    break;
                default:
                    features = DEFAULT_FREE_PLAN_FEATURES;
            }

            return features.includes(featureId as any);
        }

        // Check database for feature access
        const access = await prisma.planFeatureAccess.findUnique({
            where: {
                planId_featureId: {
                    planId,
                    featureId,
                }
            },
            include: {
                feature: {
                    select: { isActive: true }
                }
            }
        });

        return access !== null && access.feature.isActive;
    } catch (error) {
        console.error('[checkPlanFeatureAccess] Error:', error);
        // Fall back to hardcoded on error
        return DEFAULT_FREE_PLAN_FEATURES.includes(featureId as any);
    }
}
