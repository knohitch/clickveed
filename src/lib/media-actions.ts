

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

/**
 * Creates a new media asset record in the database
 */
export async function createMediaAsset(
    name: string,
    type: 'IMAGE' | 'VIDEO' | 'AUDIO',
    url: string,
    size: number
): Promise<MediaAsset | null> {
    const session = await auth();
    if (!session?.user?.id) {
        return null;
    }

    try {
        const asset = await prisma.mediaAsset.create({
            data: {
                name,
                type,
                url,
                size,
                userId: session.user.id,
            }
        });

        return {
            id: asset.id,
            name: asset.name,
            type: asset.type as 'IMAGE' | 'VIDEO' | 'AUDIO',
            url: asset.url,
            size: asset.size,
            createdAt: asset.createdAt.toLocaleDateString(),
        };
    } catch (error) {
        console.error("Failed to create media asset:", error);
        return null;
    }
}

/**
 * Deletes a media asset from both database and storage
 */
export async function deleteMediaAsset(assetId: number): Promise<{ success: boolean; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // Get the asset
        const asset = await prisma.mediaAsset.findFirst({
            where: {
                id: assetId,
                userId: session.user.id,
            }
        });

        if (!asset) {
            return { success: false, error: 'Asset not found' };
        }

        // Try to extract storage key from URL pattern
        // URLs from our storage system look like: https://bucket.endpoint/media/userId/timestamp.ext
        try {
            const url = new URL(asset.url);
            const pathParts = url.pathname.split('/');
            if (pathParts.length >= 3 && pathParts[1] === 'media') {
                const storageKey = pathParts.slice(1).join('/'); // Reconstruct media/userId/filename
                
                const { deleteFromStorage } = await import('@/server/actions/storage-actions');
                const storageResult = await deleteFromStorage(storageKey);
                
                if (!storageResult.success) {
                    console.warn('Failed to delete from storage:', storageResult.error);
                }
            }
        } catch (urlError) {
            console.warn('Could not parse URL for storage deletion:', urlError);
        }

        // Delete from database
        await prisma.mediaAsset.delete({
            where: { id: assetId }
        });

        return { success: true };
    } catch (error) {
        console.error("Failed to delete media asset:", error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Delete failed'
        };
    }
}

/**
 * Get file type category from filename
 */
export function getFileTypeFromName(filename: string): 'IMAGE' | 'VIDEO' | 'AUDIO' {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
        return 'IMAGE';
    }
    
    if (['mp4', 'webm', 'avi', 'mov', 'flv', 'wmv', 'mkv'].includes(extension)) {
        return 'VIDEO';
    }
    
    return 'AUDIO';
}
