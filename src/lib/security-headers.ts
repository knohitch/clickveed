'use server';

/**
 * Security headers configuration for production
 */
export class SecurityHeaders {
  /**
   * Get security headers for HTTP responses
   */
  static getHeaders(): Record<string, string> {
    return {
      // Content Security Policy
      'Content-Security-Policy': `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval';
        style-src 'self' 'unsafe-inline';
        img-src 'self' data: blob: https:;
        font-src 'self' data:;
        connect-src 'self' https: wss:;
        frame-src 'none';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        report-uri /api/security/report;
      `.replace(/\s+/g, ' ').trim(),
      
      // XSS Protection
      'X-XSS-Protection': '1; mode=block',
      
      // Clickjacking protection
      'X-Frame-Options': 'DENY',
      
      // MIME type sniffing prevention
      'X-Content-Type-Options': 'nosniff',
      
      // Referrer policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Permissions policy
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      
      // Strict Transport Security (only in production)
      ...(process.env.NODE_ENV === 'production' ? {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
      } : {}),
    };
  }

  /**
   * Apply security headers to a response
   */
  static applyHeaders(response: Response): Response {
    const headers = new Headers(response.headers);
    
    // Add security headers
    Object.entries(this.getHeaders()).forEach(([key, value]) => {
      headers.set(key, value);
    });
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
}
