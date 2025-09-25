
'use server';

import prisma from '@/server/prisma';
import { auth } from '@/auth';
import type { User, Plan, UserUsage } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export type UserStatus = 'Active' | 'Pending';

export type UserWithRole = Partial<User> & {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    emailVerified?: boolean | null;
    role: UserRole;
    status: UserStatus;
    plan?: string;
};

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
 */
export async function getUserById(id: string): Promise<User & { plan: Plan | null, usage: UserUsage | null } | null> {
    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            plan: true,
            usage: true
        }
    });
    return user;
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

    // TODO: Send an email invitation with a link to set the password.
    console.log(`User invitation created for ${userData.email}. They need to set their password.`);

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
export interface BrandKit {
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    headlineFont?: string | null;
    bodyFont?: string | null;
}
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
