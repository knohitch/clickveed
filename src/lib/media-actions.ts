

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

function stripInvisibleChars(value: string): string {
    return value.replace(/[\u200B-\u200D\uFEFF\u00A0\r\n\t]/g, '').trim();
}

function normalizePublicUrl(rawUrl: string): string {
    const value = stripInvisibleChars(rawUrl);
    if (!value) return value;
    if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) {
        return value;
    }
    if (value.startsWith('//')) {
        return `https:${value}`;
    }
    // Handle protocol-less host/path values like cdn.example.com/path/file.png
    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) {
        return `https://${value}`;
    }
    return value;
}

function extractStorageKeyFromUrl(rawUrl: string): string | null {
    const normalized = normalizePublicUrl(rawUrl);
    if (!normalized) return null;

    try {
        const parsed = new URL(normalized);
        const segments = parsed.pathname.split('/').filter(Boolean);
        if (segments.length === 0) return null;

        const knownRoots = new Set(['media', 'images', 'videos', 'audio']);
        const rootIndex = segments.findIndex((segment) => knownRoots.has(segment.toLowerCase()));
        if (rootIndex >= 0) {
            return segments.slice(rootIndex).join('/');
        }

        // Handle direct endpoint URLs that include bucket as first path segment:
        // /<bucket>/<images|videos|audio|media>/...
        if (segments.length >= 2 && knownRoots.has(segments[1].toLowerCase())) {
            return segments.slice(1).join('/');
        }

        return segments.join('/');
    } catch {
        return null;
    }
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
            url: normalizePublicUrl(asset.url),
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
            url: normalizePublicUrl(asset.url),
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

        // Delete from database first so the UI responds immediately
        await prisma.mediaAsset.delete({
            where: { id: assetId }
        });

        // Best-effort storage cleanup after DB delete (non-blocking for caller)
        try {
            const storageKey = extractStorageKeyFromUrl(asset.url);
            if (storageKey) {
                const { deleteFromStorage } = await import('@/server/actions/storage-actions');
                const storageResult = await deleteFromStorage(storageKey);
                if (!storageResult.success) {
                    console.warn('Failed to delete from storage:', storageResult.error);
                }
            }
        } catch (urlError) {
            console.warn('Could not extract storage key for deletion:', urlError);
        }

        return { success: true };
    } catch (error) {
        console.error("Failed to delete media asset:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Delete failed'
        };
    }
}
