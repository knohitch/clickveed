

'use server';

import prisma, { withRetry } from '@/server/prisma';
import { auth } from '@/auth';
import { storageManager } from '@/lib/storage';

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

function getUrlHost(rawUrl: string): string | null {
    const normalized = normalizePublicUrl(rawUrl);
    if (!normalized) return null;
    try {
        return new URL(normalized).host.toLowerCase();
    } catch {
        return null;
    }
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

interface SignedUrlContext {
    canSign: boolean;
    wasabiEndpointHost: string;
    wasabiBucket: string;
    bunnyHost: string | null;
}

function isLikelyPrivateStorageUrl(rawUrl: string, context: SignedUrlContext): boolean {
    if (!context.canSign) return false;
    const normalized = normalizePublicUrl(rawUrl);
    if (!normalized) return false;

    let parsed: URL;
    try {
        parsed = new URL(normalized);
    } catch {
        return false;
    }

    if (parsed.protocol === 'data:') return false;
    if (parsed.searchParams.has('X-Amz-Signature')) return false;

    const host = parsed.host.toLowerCase();
    const wasabiEndpointHost = context.wasabiEndpointHost.toLowerCase();
    const wasabiBucket = context.wasabiBucket.toLowerCase();

    if (context.bunnyHost && host === context.bunnyHost.toLowerCase()) {
        return false;
    }

    if (host.includes('wasabisys.com')) return true;
    if (wasabiEndpointHost && (host === wasabiEndpointHost || host.endsWith(`.${wasabiEndpointHost}`))) {
        return true;
    }
    if (wasabiBucket && host.startsWith(`${wasabiBucket}.`)) {
        return true;
    }

    const segments = parsed.pathname.split('/').filter(Boolean);
    if (wasabiBucket && segments[0]?.toLowerCase() === wasabiBucket) {
        return true;
    }

    return false;
}

async function resolveClientAssetUrl(rawUrl: string, context: SignedUrlContext): Promise<string> {
    const normalized = normalizePublicUrl(rawUrl);
    if (!isLikelyPrivateStorageUrl(normalized, context)) {
        return normalized;
    }

    const storageKey = extractStorageKeyFromUrl(normalized);
    if (!storageKey) {
        return normalized;
    }

    try {
        return await storageManager.getSignedReadUrl(storageKey, 60 * 60);
    } catch (error) {
        console.warn('[media-library] Failed to generate signed URL, falling back to stored URL', {
            storageKey,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return normalized;
    }
}

async function getFallbackSignedUrl(rawUrl: string): Promise<string | null> {
    const storageKey = extractStorageKeyFromUrl(rawUrl);
    if (!storageKey) return null;

    try {
        const initialized = await storageManager.ensureInitialized();
        if (!initialized || !storageManager.isConfigured()) {
            return null;
        }

        return await storageManager.getSignedReadUrl(storageKey, 60 * 60);
    } catch (error) {
        console.warn('[media-library] Failed to create fallback signed URL', {
            storageKey,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
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
        const assets = await withRetry(
            () =>
                prisma.mediaAsset.findMany({
                    where: {
                        userId: session.user.id,
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }),
            { operationName: 'mediaAsset.findMany' }
        );

        const signedUrlContext: SignedUrlContext = {
            canSign: false,
            wasabiEndpointHost: '',
            wasabiBucket: '',
            bunnyHost: null,
        };

        try {
            const initialized = await storageManager.ensureInitialized();
            if (initialized && storageManager.isConfigured()) {
                const storageConfig = storageManager.getConfig();
                signedUrlContext.canSign = true;
                signedUrlContext.wasabiEndpointHost = stripInvisibleChars(storageConfig.wasabi.endpoint).replace(/^https?:\/\//i, '').replace(/\/+$/, '');
                signedUrlContext.wasabiBucket = stripInvisibleChars(storageConfig.wasabi.bucket);
                signedUrlContext.bunnyHost = storageConfig.bunny.cdnUrl ? getUrlHost(storageConfig.bunny.cdnUrl) : null;
            }
        } catch (error) {
            console.warn('[media-library] Could not initialize storage for signed URL generation', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }

        console.info('[media-library] Loaded media assets', {
            userId: session.user.id,
            count: assets.length,
            canSign: signedUrlContext.canSign,
            wasabiEndpointHost: signedUrlContext.wasabiEndpointHost || '(empty)',
            bunnyHost: signedUrlContext.bunnyHost || '(none)',
        });

        return await Promise.all(
            assets.map(async (asset) => ({
                id: asset.id,
                name: asset.name,
                type: asset.type as 'IMAGE' | 'VIDEO' | 'AUDIO',
                url: await resolveClientAssetUrl(asset.url, signedUrlContext),
                size: asset.size,
                createdAt: asset.createdAt.toLocaleDateString(),
            }))
        );
    } catch (error) {
        console.error("Failed to fetch media assets:", error);
        console.error('[media-library] Media asset query failed', {
            userId: session.user.id,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to load media assets from the database.');
    }
}

/**
 * Returns a best-effort fallback URL (signed from storage) for a single media asset.
 * Useful when a CDN/original URL fails to render on the client.
 */
export async function getMediaAssetFallbackUrl(assetId: number): Promise<string | null> {
    const session = await auth();
    if (!session?.user?.id) {
        return null;
    }

    try {
        const asset = await withRetry(
            () =>
                prisma.mediaAsset.findFirst({
                    where: {
                        id: assetId,
                        userId: session.user.id,
                    },
                    select: {
                        id: true,
                        url: true,
                    },
                }),
            { operationName: 'mediaAsset.findFirst(fallbackUrl)' }
        );

        if (!asset) {
            return null;
        }

        const fallback = await getFallbackSignedUrl(asset.url);
        if (fallback) {
            console.info('[media-library] Resolved fallback URL for asset', {
                userId: session.user.id,
                assetId: asset.id,
            });
        }

        return fallback;
    } catch (error) {
        console.warn('[media-library] Failed to resolve fallback URL', {
            userId: session.user.id,
            assetId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return null;
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
        const asset = await withRetry(
            () =>
                prisma.mediaAsset.create({
                    data: {
                        name,
                        type,
                        url,
                        size,
                        userId: session.user.id,
                    }
                }),
            { operationName: 'mediaAsset.create' }
        );

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
        const asset = await withRetry(
            () =>
                prisma.mediaAsset.findFirst({
                    where: {
                        id: assetId,
                        userId: session.user.id,
                    }
                }),
            { operationName: 'mediaAsset.findFirst(delete)' }
        );

        if (!asset) {
            return { success: false, error: 'Asset not found' };
        }

        // Delete from database first so the UI responds immediately
        await withRetry(
            () =>
                prisma.mediaAsset.delete({
                    where: { id: assetId }
                }),
            { operationName: 'mediaAsset.delete' }
        );

        // Best-effort storage cleanup after DB delete (non-blocking for caller)
        try {
            const storageKey = extractStorageKeyFromUrl(asset.url);
            if (storageKey) {
                const { deleteFromStorage } = await import('@/server/actions/storage-actions');
                const storageResult = await deleteFromStorage(storageKey, session.user.id);
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
