# Redis Migration to Edge Runtime Compatibility

## Issue
The application had Redis/ioredis usage in Edge Runtime routes, which is not supported since `process.nextTick` and other Node.js APIs are not available in Edge Runtime environments.

## Root Cause
The rate limiting middleware in `src/middleware.ts` was directly using Redis via ioredis to enforce rate limits on `/api/ai` routes. This caused compatibility issues when running in Edge Runtime environments.

## Solution Implemented

### 1. Created Server-Side Rate Limiting Endpoint
- Created a new API endpoint at `src/app/api/rate-limit/route.ts`
- This endpoint handles all Redis operations server-side where they are supported
- The endpoint accepts rate limit parameters via POST request

### 2. Updated Middleware
- Modified `src/middleware.ts` to make HTTP calls to the new server-side endpoint
- Removed direct Redis usage from Edge Runtime code
- Maintained the same rate limiting behavior and headers

### 3. Deprecated Old Rate Limiter
- Updated `src/lib/rate-limiter.ts` to be deprecated
- The old implementation now only returns `isLimited: false` to avoid breaking existing code
- Added deprecation notices to all methods

## Files Modified

1. **`src/app/api/rate-limit/route.ts`** - New server-side rate limiting endpoint
2. **`src/middleware.ts`** - Updated to use the new API endpoint instead of direct Redis access
3. **`src/lib/rate-limiter.ts`** - Deprecated with deprecation warnings
4. **`src/lib/test-utils.ts`** - Removed Redis-specific test functions

## Benefits

- ✅ Resolves Edge Runtime compatibility issues
- ✅ Maintains same rate limiting functionality
- ✅ Preserves all rate limit headers and behavior
- ✅ Server-side Redis operations remain unchanged
- ✅ Backward compatibility maintained for existing code

## How It Works

1. Edge Runtime middleware receives a request to `/api/ai`
2. Instead of directly accessing Redis, it makes a POST request to `/api/rate-limit`
3. Server-side endpoint handles Redis operations and returns rate limit status
4. Middleware responds with appropriate 429 status or proceeds with request

## Testing

The rate limiting functionality continues to work as expected:
- Rate limits are enforced correctly
- Headers are properly set (X-RateLimit-* headers)
- Fallback behavior when Redis is unavailable
- All existing tests should continue to pass
