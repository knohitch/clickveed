'use server';

import { revalidatePath } from 'next/cache';
import { clearAllCaches, getCacheStats } from '../../lib/cache-manager';

/**
 * Clear all application caches
 * This includes:
 * - Next.js Data Cache (revalidates all routes)
 * - Static file cache
 * - Any in-memory caches
 */
export async function clearAllAppCaches(): Promise<{ success: boolean; message: string; clearedItems: string[] }> {
  const clearedItems: string[] = [];
  const errors: string[] = [];

  try {
    // 1. Clear Next.js Data Cache by revalidating all possible paths
    const pathsToRevalidate = [
      '/dashboard',
      '/dashboard/settings',
      '/dashboard/settings/billing',
      '/chin/dashboard',
      '/chin/dashboard/settings',
    ];

    for (const path of pathsToRevalidate) {
      try {
        revalidatePath(path, 'page');
        clearedItems.push(`Route: ${path}`);
      } catch (e) {
        errors.push(`Failed to revalidate ${path}: ${e}`);
      }
    }

    // 2. Clear all managed caches
    try {
      const cacheResult = clearAllCaches();
      clearedItems.push(...cacheResult.cleared);
    } catch (e) {
      errors.push(`Cache clear error: ${e}`);
    }

    // 3. Clear any API route caches by revalidating
    const apiPaths = [
      '/api/admin/settings',
      '/api/user',
      '/api/notifications',
    ];

    for (const path of apiPaths) {
      try {
        revalidatePath(path);
        clearedItems.push(`API: ${path}`);
      } catch (e) {
        // Ignore API path errors
      }
    }

    console.log('[CacheService] Cache clear completed:', clearedItems.length, 'items cleared');

    return {
      success: errors.length === 0,
      message: errors.length === 0 
        ? `Successfully cleared ${clearedItems.length} cache items` 
        : `Cleared ${clearedItems.length} items with ${errors.length} errors`,
      clearedItems,
    };
  } catch (error) {
    console.error('[CacheService] Failed to clear caches:', error);
    return {
      success: false,
      message: `Failed to clear caches: ${error}`,
      clearedItems,
    };
  }
}

/**
 * Get cache status - shows what caches exist and their sizes
 */
export async function getCacheStatus(): Promise<{
  status: string;
  cacheItems: string[];
  stats: { size: number; maxSize: number };
  memoryUsage: { heapTotal: number; heapUsed: number; external: number; rss: number };
}> {
  const cacheItems: string[] = ['Next.js Data Cache', 'Route Cache', 'API Cache', 'In-Memory Cache'];
  
  const memoryUsage = process.memoryUsage();
  const cacheStats = getCacheStats();

  return {
    status: 'active',
    cacheItems,
    stats: {
      size: cacheStats.size,
      maxSize: cacheStats.maxSize,
    },
    memoryUsage: {
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
    },
  };
}
