
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// Custom middleware logic to handle special cases
export default auth(async (req) => {
  // Server-side rate limiting for AI routes (Edge Runtime compatible)
  if (req.nextUrl.pathname.startsWith('/api/ai')) {
    const ip = req.ip || 'unknown';
    const clientIP = req.headers.get('x-forwarded-for') || ip;
    const rateKey = `ai:${clientIP}`;
    
    try {
      // Call the server-side rate limiting API
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/rate-limit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: rateKey,
          windowMs: 60000,
          maxRequests: 10
        }),
      });
      
      const { isLimited, resetTime } = await response.json();
      
      if (isLimited) {
        const headers = new Headers();
        if (resetTime) {
          headers.set('X-RateLimit-Limit', '10');
          headers.set('X-RateLimit-Remaining', '0');
          headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
        }
        
        return new NextResponse(
          JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), 
          { 
            status: 429,
            headers
          }
        );
      }
    } catch (error) {
      // If rate limiting API fails, allow the request through
      console.error('Rate limiting API error:', error);
    }
  }

  // For /chin/signup, we need special handling
  if (req.nextUrl.pathname === '/chin/signup') {
    // Allow access to /chin/signup - the page itself will check if Super Admin creation is allowed
    return NextResponse.next();
  }
  
  // For all other routes, use the default auth middleware behavior
  return undefined; // This allows the default auth behavior to proceed
});

export const config = {
  // The matcher is updated to protect specific application routes that require authentication,
  // while excluding public pages like login, signup, or the landing page.
  // It now specifically targets dashboard, admin, and support panel routes.
  matcher: [
    '/dashboard/:path*',
    '/chin/:path*', // This will match all /chin paths
    '/kanri/:path*',
    '/', // Protect the root for logged-in users
    '/signup', // Protect the signup page for logged-in users
    // Note: /chin/signup is intentionally excluded to allow Super Admin creation
    '/chin/login', // This is protected as it's only for existing Super Admins
  ],
};
