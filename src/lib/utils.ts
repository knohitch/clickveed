import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get file type category from filename
 * Moved from media-actions.ts to avoid server action issues
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

/**
 * Get the base URL for the application
 * Uses NEXTAUTH_URL from environment, or constructs from request headers
 * @param request - Optional Request object to extract URL from headers
 * @returns The base URL without trailing slash
 */
export function getBaseUrl(request?: Request): string {
    // Prefer explicit env values (single place)
    const envBase = process.env.NEXTAUTH_URL || process.env.AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL;
    if (envBase) {
        return envBase.replace(/\/$/, '');
    }

    // Construct from request headers when available (CapRover/NGINX sets x-forwarded-proto)
    if (request) {
        const host = request.headers.get('host');
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        if (host) {
            return `${protocol}://${host}`.replace(/\/$/, '');
        }
    }

    // Vercel fallback
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
    }

    // CRITICAL FIX: In production, log error but don't throw - return a warning URL
    // This prevents the app from crashing entirely while alerting about misconfiguration
    if (process.env.NODE_ENV === 'production') {
        console.error('CRITICAL: Base URL is not configured! Set NEXTAUTH_URL or AUTH_URL (or NEXT_PUBLIC_SITE_URL) in environment.');
        // Return the request URL origin if available, otherwise fallback
        if (request) {
            try {
                const url = new URL(request.url);
                return `${url.protocol}//${url.host}`;
            } catch (e) {
                // Ignore URL parsing errors
            }
        }
        // Last resort - return empty to prevent localhost links in production
        return '';
    }

    // Development fallback
    console.warn('NEXTAUTH_URL/AUTH_URL not configured, using localhost fallback');
    return 'http://localhost:3000';
}
