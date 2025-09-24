'use server';

// This file is now deprecated and only kept for backward compatibility
// Rate limiting is now handled in the server-side API endpoint

/**
 * Rate limiter class for handling request throttling
 * @deprecated - Use the server-side API endpoint instead
 */
export class RateLimiter {
  /**
   * @deprecated - Use the server-side API endpoint instead
   */
  static async isRateLimited(
    key: string, 
    windowMs: number = 60000, // 1 minute default
    maxRequests: number = 10
  ): Promise<{ isLimited: boolean; resetTime?: number }> {
    // This method is deprecated. Use the server-side API endpoint instead.
    // Return not limited to avoid blocking requests
    return { isLimited: false };
  }

  /**
   * @deprecated - Use the server-side API endpoint instead
   */
  static getRateLimitHeaders(
    isLimited: boolean, 
    resetTime?: number
  ): Record<string, string> {
    // This method is deprecated
    return {};
  }
}
