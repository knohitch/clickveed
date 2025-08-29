

'use server';

import prisma from './prisma';
import { auth } from '@/auth';

export interface MediaAsset {
    id: number;
    name: string;
    type: 'IMAGE' | 'VIDEO' | 'AUDIO';
    url: string;
    size: number;
    createdAt: string;
}

/**
 * Retrieves all media assets for the current user from the database.
 */
export async function getMediaAssets(): Promise<MediaAsset[]> {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    try {
        const assets = await prisma.mediaAsset.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return assets.map(asset => ({
            id: asset.id,
            name: asset.name,
            type: asset.type as 'IMAGE' | 'VIDEO' | 'AUDIO',
            url: asset.url,
            size: asset.size,
            createdAt: asset.createdAt.toLocaleDateString(),
        }));
    } catch (error) {
        console.error("Failed to fetch media assets:", error);
        return [];
    }
}
