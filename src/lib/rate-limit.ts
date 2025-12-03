import { NextResponse } from 'next/server';

// Simple in-memory rate limiter for production
// In production, consider using Redis or a proper rate limiting service
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  maxRequests?: number; // Max requests per window
  message?: string; // Custom error message
}

export function createRateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 60 * 1000, // 1 minute default
    maxRequests = 10, // 10 requests per minute default
    message = 'Too many requests. Please try again later.'
  } = options;

  return function rateLimit(request: Request) {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const key = `rate_limit:${ip}`;
    const now = Date.now();
    
    const record = rateLimitStore.get(key);
    
    if (!record || now > record.resetTime) {
      // New window or expired window
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return null; // Not rate limited
    }
    
    if (record.count >= maxRequests) {
      // Rate limited
      const resetIn = Math.ceil((record.resetTime - now) / 1000);
      return NextResponse.json(
        { error: message, retryAfter: resetIn },
        { 
          status: 429,
          headers: {
            'Retry-After': resetIn.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': record.resetTime.toString()
          }
        }
      );
    }
    
    // Increment counter
    record.count++;
    return null; // Not rate limited
  };
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes
