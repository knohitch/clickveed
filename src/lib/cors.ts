'use server';

/**
 * CORS configuration for API endpoints
 */
export class CorsConfig {
  static getHeaders(): Record<string, string> {
    return {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400', // 24 hours
      'Access-Control-Allow-Credentials': 'true',
    };
  }

  static getOptionsHeaders(): Record<string, string> {
    return {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    };
  }

  /**
   * Create a CORS-enabled response
   */
  static createCORSResponse(response: Response): Response {
    const headers = new Headers(response.headers);
    
    // Add CORS headers
    Object.entries(this.getHeaders()).forEach(([key, value]) => {
      headers.set(key, value);
    });
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  /**
   * Handle preflight OPTIONS requests
   */
  static handlePreflight(): Response {
    return new Response(null, {
      status: 204,
      headers: this.getOptionsHeaders()
    });
  }
}
