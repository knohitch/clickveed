
'use server';

import prisma from '@/server/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export interface SocialConnection {
    id: number;
    userId: string;
    platform: string;
    name: string;
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: Date | null;
    createdAt: Date;
}

/**
 * Retrieves all social media connections for the currently authenticated user.
 */
export async function getConnections(): Promise<SocialConnection[]> {
    const session = await auth();
    if (!session?.user?.id) return [];

    const connections = await prisma.socialConnection.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
    });
    
    return connections;
}


/**
 * Creates or updates a social media connection for a user.
 */
export async function upsertConnection(data: Omit<SocialConnection, 'id' | 'createdAt'>): Promise<void> {
    await prisma.socialConnection.upsert({
        where: {
            userId_platform: {
                userId: data.userId,
                platform: data.platform,
            },
        },
        update: {
            name: data.name,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresAt: data.expiresAt,
        },
        create: {
            userId: data.userId,
            platform: data.platform,
            name: data.name,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresAt: data.expiresAt,
        },
    });
    
    revalidatePath('/dashboard/social-suite/integrations');
}

/**
 * Deletes a social media connection for the current user.
 */
export async function deleteConnection(platform: string): Promise<void> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("User is not authenticated.");
    }
    
    await prisma.socialConnection.delete({
        where: {
            userId_platform: {
                userId: session.user.id,
                platform: platform,
            },
        },
    });
    
    revalidatePath('/dashboard/social-suite/integrations');
}
