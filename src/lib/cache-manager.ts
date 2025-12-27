// Simple in-memory cache manager for Next.js applications
// In production, consider using Redis for distributed caching

interface CacheEntry {
  key: string;
  value: any;
  expiresAt?: number;
}

const globalCache = new Map<string, CacheEntry>();
const maxCacheSize = 1000; // Maximum number of entries
const defaultTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Set a value in the cache
 */
export function setCache(key: string, value: any, ttlMs?: number): void {
  // Clear oldest entries if cache is full
  if (globalCache.size >= maxCacheSize) {
    const oldestKey = globalCache.keys().next().value;
    if (oldestKey) {
      globalCache.delete(oldestKey);
    }
  }

  globalCache.set(key, {
    key,
    value,
    expiresAt: ttlMs ? Date.now() + ttlMs : Date.now() + defaultTTL,
  });
}

/**
 * Get a value from the cache
 */
export function getCache<T = any>(key: string): T | null {
  const entry = globalCache.get(key);
  
  if (!entry) return null;
  
  // Check if expired
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    globalCache.delete(key);
    return null;
  }
  
  return entry.value as T;
}

/**
 * Delete a value from the cache
 */
export function deleteCache(key: string): boolean {
  return globalCache.delete(key);
}

/**
 * Check if a key exists in cache
 */
export function hasCache(key: string): boolean {
  const entry = globalCache.get(key);
  if (!entry) return false;
  
  // Check if expired
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    globalCache.delete(key);
    return false;
  }
  
  return true;
}

/**
 * Clear all entries with a specific prefix
 */
export function clearCacheByPrefix(prefix: string): number {
  let count = 0;
  for (const key of globalCache.keys()) {
    if (key.startsWith(prefix)) {
      globalCache.delete(key);
      count++;
    }
  }
  return count;
}

/**
 * Clear all caches managed by this module
 */
export function clearAllCaches(): { cleared: string[]; count: number } {
  const count = globalCache.size;
  const keys = Array.from(globalCache.keys());
  globalCache.clear();
  return { cleared: keys, count };
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; maxSize: number; keys: string[] } {
  // Clean expired entries first
  for (const [key, entry] of globalCache.entries()) {
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      globalCache.delete(key);
    }
  }

  return {
    size: globalCache.size,
    maxSize: maxCacheSize,
    keys: Array.from(globalCache.keys()),
  };
}

/**
 * Get memory usage information
 */
export function getCacheMemoryUsage(): { entries: number; approximateSize: string } {
  // Rough estimate: each entry is roughly 1KB + value size
  const entries = globalCache.size;
  return {
    entries,
    approximateSize: `${(entries * 1024 / 1024).toFixed(2)} KB`,
  };
}
