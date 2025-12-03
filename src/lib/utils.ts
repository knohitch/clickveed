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
