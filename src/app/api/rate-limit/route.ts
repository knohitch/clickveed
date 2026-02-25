import { NextRequest, NextResponse } from 'next/server';
import IORedis from 'ioredis';
import { getRedisUrl } from '@/lib/redis-config';

// Redis connection for rate limiting (server-side only)
const redisUrl = getRedisUrl();
const redisClient = redisUrl
  ? new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    })
  : null;

/**
 * Check if a request should be rate limited
 * @param key Unique identifier for the rate limit (e.g., IP address)
 * @param windowMs Time window in milliseconds
 * @param maxRequests Maximum number of requests allowed
 * @returns True if request should be rate limited, false otherwise
 */
async function isRateLimited(
  key: string, 
  windowMs: number = 60000, // 1 minute default
  maxRequests: number = 10
): Promise<{ isLimited: boolean; resetTime?: number }> {
  // If Redis is not configured, return not limited
  if (!redisClient) {
    return { isLimited: false };
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
    // Return not limited if Redis fails
    return { isLimited: false };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { key, windowMs, maxRequests } = await request.json();
    
    if (!key) {
      return NextResponse.json(
        { error: 'Rate limit key is required' }, 
        { status: 400 }
      );
    }
    
    const { isLimited, resetTime } = await isRateLimited(key, windowMs, maxRequests);
    
    const headers = new Headers();
    if (isLimited && resetTime) {
      headers.set('X-RateLimit-Limit', '10');
      headers.set('X-RateLimit-Remaining', '0');
      headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
    }
    
    return NextResponse.json(
      { isLimited, resetTime }, 
      { 
        status: isLimited ? 429 : 200,
        headers
      }
    );
  } catch (error) {
    console.error('Rate limit API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
