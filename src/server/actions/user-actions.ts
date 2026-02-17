
'use server';

import prisma from '@/server/prisma';
import { auth } from '@/auth';
import type { User, Plan, UserUsage, PlanFeature } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { getBaseUrl } from '@/lib/utils';
import type { UserRole, UserStatus, UserWithRole, BrandKit } from './user-types';

// Re-export types for consumers
export type { UserRole, UserStatus, UserWithRole, BrandKit } from './user-types';


/**
 * Retrieves a list of all users.
 */
export async function getUsers(): Promise<UserWithRole[]> {
    const users = await prisma.user.findMany({
        include: {
            plan: true
        }
    });

    return users.map(user => ({
        id: user.id,
        name: user.displayName,
        email: user.email,
        image: user.avatarUrl,
        emailVerified: user.emailVerified,
        role: user.role as UserRole,
        status: user.status as UserStatus,
        plan: user.plan?.name || 'Free'
    }));
}

/**
 * Retrieves a single user by their ID.
 * If the user doesn't have a plan assigned, automatically assigns the Free plan.
 */
export async function getUserById(id: string): Promise<(User & { plan: Plan & { features: PlanFeature[] } | null }) & { usage: UserUsage | null } | null> {
    let user = await prisma.user.findUnique({
        where: { id },
        include: {
            plan: {
                include: {
                    features: true
                }
            },
            usage: true
        }
    });

    // If user exists but has no plan, auto-assign the Free plan
    if (user && !user.planId) {
        console.log('[getUserById] User has no plan, attempting to assign Free plan:', id);

        const freePlan = await prisma.plan.findFirst({
            where: {
                OR: [
                    { name: 'Free' },
                    { featureTier: 'free' }
                ]
            },
            include: {
                features: true
            }
        });

        if (freePlan) {
            console.log('[getUserById] Assigning Free plan to user:', id);

            // Update user with Free plan
            user = await prisma.user.update({
                where: { id },
                data: { planId: freePlan.id },
                include: {
                    plan: {
                        include: {
                            features: true
                        }
                    },
                    usage: true
                }
            });

            console.log('[getUserById] Free plan assigned successfully');
        } else {
            console.warn('[getUserById] Free plan not found in database - seed may not have run properly');
        }
    }

    return user as any;
}

/**
 * Retrieves usage stats for the current user.
 */
export async function getUserUsageStats() {
    const session = await auth();
    if (!session?.user?.id) {
        return { projects: 0, mediaAssets: 0, aiCredits: 0, storage: 0 };
    }
    const usage = await prisma.userUsage.findUnique({
        where: { userId: session.user.id }
    });
    return {
        projects: usage?.projects || 0,
        mediaAssets: usage?.mediaAssets || 0,
        aiCredits: usage?.aiCreditsUsed || 0,
        storage: usage?.storageUsedGB || 0
    };
}


/**
 * Creates a pending user with the 'Admin' role.
 */
export async function createPendingAdminUser(userData: { fullName: string; email: string; password?: string, role?: 'Admin' | 'User' }): Promise<UserWithRole> {
    const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
    });

    if (existingUser) {
        throw new Error("An account with this email already exists.");
    }

    const freePlan = await prisma.plan.findFirst({
        where: { name: 'Free' }
    });
    if (!freePlan) {
        throw new Error("Default 'Free' plan not found. Please seed the database.");
    }

    // In a real app, you would hash the password here before saving
    const newUser = await prisma.user.create({
        data: {
            displayName: userData.fullName,
            email: userData.email,
            role: userData.role || 'Admin',
            status: 'Pending',
            planId: freePlan.id,
        }
    });

    // Send email invitation with a link to set up password
    const { sendEmail } = await import('@/server/services/email-service');
    // Use NEXT_PUBLIC_SITE_URL for production URLs, fallback to localhost for development
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    try {
        await sendEmail({
            templateKey: 'userInvitation',
            to: userData.email,
            data: {
                name: userData.fullName,
                invitationLink: `${appUrl}/auth/reset-password?email=${encodeURIComponent(userData.email)}`
            }
        });
        console.log(`User invitation email sent to ${userData.email}`);
    } catch (error) {
        console.error('Failed to send invitation email:', error);
        // Continue even if email fails - user can still login and set password
    }

    return {
        id: newUser.id,
        name: newUser.displayName,
        email: newUser.email,
        role: newUser.role as UserRole,
        status: newUser.status as UserStatus,
        plan: freePlan.name
    };
}

type UpsertUserData = Partial<Pick<User, 'id' | 'email' | 'displayName' | 'avatarUrl' | 'stripeCustomerId' | 'stripeSubscriptionId' | 'stripeSubscriptionStatus' | 'stripePriceId' | 'stripeCurrentPeriodEnd' | 'onboardingComplete' | 'planId'>> & {
    onboardingData?: Record<string, any>;
    name?: string; // For compatibility with external interfaces
    image?: string; // For compatibility with external interfaces
};

/**
 * Creates or updates a user record.
 */
export async function upsertUser(data: UpsertUserData) {
    if (!data.id && !data.email) {
        throw new Error("User ID or email is required to upsert user.");
    }

    // Map name and image to the correct field names if provided
    const { onboardingData, name, image, ...userData } = data;

    // Add the mapped fields back with correct names
    if (name !== undefined) userData.displayName = name;
    if (image !== undefined) userData.avatarUrl = image;

    const finalUserData: any = { ...userData };
    if (onboardingData) {
        finalUserData.onboardingComplete = true;
        finalUserData.onboardingData = onboardingData;
    }

    const whereClause = data.id ? { id: data.id } : { email: data.email! };

    return await prisma.user.upsert({
        where: whereClause,
        update: finalUserData,
        create: {
            ...finalUserData,
            email: data.email!, // Email is required for creation
            role: 'USER',
            status: 'Active',
        },
    });
}


/**
 * Retrieves the BrandKit for the current user.
 */
export async function getBrandKit(): Promise<BrandKit | null> {
    const session = await auth();
    if (!session?.user?.id) return null;

    const brandKit = await prisma.brandKit.findUnique({
        where: { userId: session.user.id },
    });

    return brandKit;
}

/**
 * Creates or updates the BrandKit for the current user.
 */
export async function upsertBrandKit(data: BrandKit) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("You must be logged in to update your brand kit.");
    }

    await prisma.brandKit.upsert({
        where: { userId: session.user.id },
        update: data,
        create: {
            ...data,
            userId: session.user.id,
        },
    });

    revalidatePath('/dashboard/settings/brand-kit');
}

/**
 * Approves a pending user, changing their status from 'Pending' to 'Active'.
 * Also sets emailVerified to true and sends a notification email.
 */
export async function approveUser(userId: string) {
    const session = await auth();
    if (!session?.user?.role || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
        throw new Error('Unauthorized: Only admins can approve users');
    }

    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        throw new Error('User not found');
    }

    if (user.status !== 'Pending') {
        throw new Error('User is not in pending status');
    }

    // Update user status to Active and set emailVerified to true
    await prisma.user.update({
        where: { id: userId },
        data: {
            status: 'Active',
            emailVerified: true
        }
    });

    // Send approval notification email to user
    try {
        const { sendEmail } = await import('@/server/services/email-service');
        const { getAdminSettings } = await import('@/server/actions/admin-actions');
        const { appName } = await getAdminSettings();
        // Use getBaseUrl utility for proper URL handling
        const baseUrl = getBaseUrl();

        await sendEmail({
            to: user.email!,
            templateKey: 'accountApproved',
            data: {
                appName,
                name: user.displayName || 'User',
                loginLink: `${baseUrl}/login`,
            }
        });
    } catch (emailError) {
        // Log but don't fail the approval if email fails
        console.error('Failed to send approval notification email:', emailError);
    }

    revalidatePath('/chin/dashboard/users');
    revalidatePath('/kanri/dashboard/users');

    return { success: true, message: 'User approved successfully' };
}

/**
 * Deletes a user from the system.
 */
export async function deleteUser(userId: string) {
    const session = await auth();
    if (!session?.user?.role || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
        throw new Error('Unauthorized: Only admins can delete users');
    }

    // Prevent deleting super admins
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, email: true }
    });

    if (!user) {
        throw new Error('User not found');
    }

    if (user.role === 'SUPER_ADMIN') {
        throw new Error('Cannot delete super admin users');
    }

    // Delete the user (cascade will handle related records)
    await prisma.user.delete({
        where: { id: userId }
    });

    revalidatePath('/chin/dashboard/users');
    revalidatePath('/kanri/dashboard/users');

    return { success: true, message: 'User deleted successfully' };
}

/**
 * Updates a user's role and status.
 */
export async function updateUser(userId: string, updates: { role?: UserRole; status?: UserStatus }) {
    const session = await auth();
    if (!session?.user?.role || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
        throw new Error('Unauthorized: Only admins can update users');
    }

    // Prevent non-super-admins from changing roles to super admin
    if (updates.role === 'SUPER_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
        throw new Error('Only super admins can assign super admin role');
    }

    await prisma.user.update({
        where: { id: userId },
        data: updates
    });

    revalidatePath('/chin/dashboard/users');
    revalidatePath('/kanri/dashboard/users');

    return { success: true, message: 'User updated successfully' };
}

/**
 * Updates a user's plan (for admin/super admin use).
 * This allows admins to manually upgrade or change a user's plan.
 * Options:
 *   resetUsage - reset AI credits counter (default: true for upgrades)
 *   notifyUser - send in-app notification (default: true)
 */
export async function updateUserPlan(
    userId: string,
    planId: string,
    options?: { resetUsage?: boolean; notifyUser?: boolean }
) {
    const session = await auth();
    if (!session?.user?.role || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
        throw new Error('Unauthorized: Only admins can update user plans');
    }

    // Verify the plan exists
    const plan = await prisma.plan.findUnique({
        where: { id: planId }
    });

    if (!plan) {
        throw new Error('Plan not found');
    }

    // Get user's current plan for comparison
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { plan: true }
    });

    if (!user) {
        throw new Error('User not found');
    }

    const oldPlanName = user.plan?.name || 'None';
    const isUpgrade = (plan.priceMonthly ?? 0) > (user.plan?.priceMonthly ?? 0);

    // Update the user's plan
    await prisma.user.update({
        where: { id: userId },
        data: { planId }
    });

    // Reset usage counters if requested (default: true for upgrades)
    const shouldResetUsage = options?.resetUsage ?? isUpgrade;
    if (shouldResetUsage) {
        await prisma.userUsage.upsert({
            where: { userId },
            update: { aiCreditsUsed: 0 },
            create: { userId, aiCreditsUsed: 0, projects: 0, mediaAssets: 0, storageUsedGB: 0 }
        });
    }

    // Create in-app notification for user (default: true)
    const shouldNotify = options?.notifyUser ?? true;
    if (shouldNotify) {
        try {
            const { createNotification } = await import('@/server/services/notification-service');
            await createNotification({
                userId,
                type: 'plan_upgraded',
                title: isUpgrade ? 'Plan Upgraded!' : 'Plan Changed',
                message: `Your plan has been ${isUpgrade ? 'upgraded' : 'changed'} from ${oldPlanName} to ${plan.name} by an administrator.${shouldResetUsage ? ' Your usage counters have been reset.' : ''}`,
            });
        } catch (notifError) {
            console.error('[updateUserPlan] Failed to create notification:', notifError);
        }
    }

    revalidatePath('/chin/dashboard/users');
    revalidatePath('/kanri/dashboard/users');
    revalidatePath('/dashboard');

    return {
        success: true,
        message: `User plan ${isUpgrade ? 'upgraded' : 'changed'} from ${oldPlanName} to ${plan.name} successfully.${shouldResetUsage ? ' Usage reset.' : ''}`
    };
}

/**
 * Fixes users with missing displayName values.
 * This function updates users who have a null or empty displayName field.
 */
export async function fixUsersWithMissingDisplayName() {
    console.log('Starting to fix users with missing display names...');

    // Find users with null or empty displayName
    const usersToFix = await prisma.user.findMany({
        where: {
            OR: [
                { displayName: null },
                { displayName: '' }
            ]
        },
        select: {
            id: true,
            email: true,
            displayName: true
        }
    });

    console.log(`Found ${usersToFix.length} users with missing display names`);

    // Update each user with a displayName derived from their email
    const updates = usersToFix.map(async (user) => {
        // Extract name from email (part before @) if displayName is missing
        let displayName = user.email ? user.email.split('@')[0] : 'User';

        // Capitalize first letter
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

        console.log(`Updating user ${user.id} with display name: ${displayName}`);

        return prisma.user.update({
            where: { id: user.id },
            data: { displayName }
        });
    });

    await Promise.all(updates);

    const result = {
        message: `Fixed ${usersToFix.length} users with missing display names.`,
        count: usersToFix.length
    };

    console.log('Finished fixing user display names:', result);
    return result;
}
