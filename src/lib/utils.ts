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
    // First priority: NEXTAUTH_URL from environment
    if (process.env.NEXTAUTH_URL) {
        return process.env.NEXTAUTH_URL.replace(/\/$/, '');
    }

    // Second priority: Construct from request headers
    if (request) {
        const host = request.headers.get('host');
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        if (host) {
            return `${protocol}://${host}`;
        }
    }

    // Third priority: Check for VERCEL_URL (Vercel deployment)
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    // Fallback to localhost for development
    console.warn('NEXTAUTH_URL not configured, using localhost fallback');
    return 'http://localhost:3000';
}
