
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// Custom middleware logic to handle special cases
export default auth((req) => {
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
