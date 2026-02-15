'use server';

import prisma from '@/server/prisma';
import { auth } from '@/auth';

/**
 * Check if user has enough AI credits and consume them
 * @param creditCost - Number of credits to consume (default 1)
 * @returns Object with success status and any error message
 */
export async function consumeAICredits(creditCost: number = 1): Promise<{ success: boolean; error?: string; remaining?: number }> {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Authentication required' };
    }

    const userId = session.user.id;

    // Get user with plan details
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { plan: true }
    });

    if (!user || !user.plan) {
        return { success: false, error: 'User or plan not found' };
    }

    // Get user's usage
    const usage = await prisma.userUsage.findUnique({
        where: { userId }
    });

    const planCredits = user.plan.aiCredits;
    
    // If plan has no credit limit, allow
    if (planCredits === null || planCredits === undefined) {
        return { success: true, remaining: -1 };
    }

    // Calculate remaining credits
    const usedCredits = usage?.aiCreditsUsed || 0;
    const remainingCredits = planCredits - usedCredits;

    if (remainingCredits < creditCost) {
        return { 
            success: false, 
            error: `Insufficient AI credits. You have ${remainingCredits} credits remaining, but this action requires ${creditCost}. Please upgrade your plan to get more credits.` 
        };
    }

    // Consume the credits
    await prisma.userUsage.upsert({
        where: { userId },
        update: {
            aiCreditsUsed: { increment: creditCost }
        },
        create: {
            userId,
            projects: 0,
            mediaAssets: 0,
            aiCreditsUsed: creditCost,
            storageUsedGB: 0,
        },
    });

    return { 
        success: true, 
        remaining: remainingCredits - creditCost 
    };
}

/**
 * Check user's AI credit status
 */
export async function getAICreditsStatus(): Promise<{ available: number; used: number; total: number; unlimited: boolean }> {
    const session = await auth();
    if (!session?.user?.id) {
        return { available: 0, used: 0, total: 0, unlimited: false };
    }

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { plan: true }
    });

    if (!user || !user.plan) {
        return { available: 0, used: 0, total: 0, unlimited: false };
    }

    const usage = await prisma.userUsage.findUnique({
        where: { userId }
    });

    const total = user.plan.aiCredits || 0;
    const used = usage?.aiCreditsUsed || 0;
    const unlimited = total === null;

    return {
        available: unlimited ? -1 : Math.max(0, total - used),
        used,
        total: unlimited ? -1 : total,
        unlimited
    };
}
