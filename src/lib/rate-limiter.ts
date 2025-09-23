'use server';

import IORedis from 'ioredis';
import { NextRequest } from 'next/server';

// Redis connection for rate limiting
const redisClient = process.env.REDIS_URL 
  ? new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    })
  : null;

/**
 * Rate limiter class for handling request throttling
 */
export class RateLimiter {
  /**
   * Check if a request should be rate limited
   * @param key Unique identifier for the rate limit (e.g., IP address)
   * @param windowMs Time window in milliseconds
   * @param maxRequests Maximum number of requests allowed
   * @returns True if request should be rate limited, false otherwise
   */
  static async isRateLimited(
    key: string, 
    windowMs: number = 60000, // 1 minute default
    maxRequests: number = 10
  ): Promise<{ isLimited: boolean; resetTime?: number }> {
    // If Redis is not configured, fall back to in-memory rate limiting
    if (!redisClient) {
      return this.inMemoryRateLimit(key, windowMs, maxRequests);
    }

    try {
      const now = Date.now();
      const windowStart = now - windowMs;
      const rateKey = `rate:${key}`;
      
      // Use Redis pipeline for atomic operations
      const pipeline = redisClient.pipeline();
      
      // Remove old requests outside the time window
      pipeline.zremrangebyscore(rateKey, 0, windowStart);
      
      // Get current count
      pipeline.zcard(rateKey);
      
      // Add current request
      pipeline.zadd(rateKey, now, now.toString());
      
      // Set expiration for the key
      pipeline.expire(rateKey, Math.ceil(windowMs / 1000));
      
      const results = await pipeline.exec();
      
      if (results && results[1] && typeof results[1][1] === 'number') {
        const currentCount = results[1][1];
        return {
          isLimited: currentCount >= maxRequests,
          resetTime: now + windowMs
        };
      }
      
      return { isLimited: false };
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fallback to in-memory if Redis fails
      return this.inMemoryRateLimit(key, windowMs, maxRequests);
    }
  }

  /**
   * In-memory rate limiting fallback
   */
  private static inMemoryRateLimit(
    key: string, 
    windowMs: number, 
    maxRequests: number
  ): { isLimited: boolean; resetTime?: number } {
    // This is a simple in-memory implementation for development
    // In production, Redis should be used
    
    if (typeof global === 'undefined') {
      return { isLimited: false };
    }
    
    if (!(global as any).rateLimits) {
      (global as any).rateLimits = new Map();
    }
    
    const now = Date.now();
    const windowStart = now - windowMs;
    const rateKey = `rate:${key}`;
    
    let requests = (global as any).rateLimits.get(rateKey) || [];
    requests = requests.filter((time: number) => time > windowStart);
    requests.push(now);
    (global as any).rateLimits.set(rateKey, requests);
    
    return {
      isLimited: requests.length > maxRequests,
      resetTime: now + windowMs
    };
  }

  /**
   * Get rate limit headers for response
   */
  static getRateLimitHeaders(
    isLimited: boolean, 
    resetTime?: number
  ): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (isLimited && resetTime) {
      headers['X-RateLimit-Limit'] = '10';
      headers['X-RateLimit-Remaining'] = '0';
      headers['X-RateLimit-Reset'] = Math.ceil(resetTime / 1000).toString();
    }
    
    return headers;
  }
}
