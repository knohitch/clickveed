import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from './auth';


export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  
  // Handle auth pages with session check
  if (request.nextUrl.pathname.startsWith('/login') || 
      request.nextUrl.pathname.startsWith('/signup') ||
      request.nextUrl.pathname.startsWith('/forgot-password') ||
      request.nextUrl.pathname.startsWith('/reset-password')) {
    
    try {
      // Fix Bug #5: Proper timeout handling without race condition
      // This allows to auth() promise to complete even if it takes longer than 2 seconds
      const session = await auth();
      
      if (session?.user) {
        // Redirect authenticated users away from auth pages
        console.log('Authenticated user with role:', session.user.role);
        if (session.user.role === 'SUPER_ADMIN') {
          const redirectUrl = new URL('/chin/dashboard', request.url);
          console.log('Redirecting SUPER_ADMIN to:', redirectUrl.toString());
          return NextResponse.redirect(redirectUrl);
        } else if (session.user.role === 'ADMIN') {
          return NextResponse.redirect(new URL('/kanri/dashboard', request.url));
        } else if (session.user.onboardingComplete) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        } else {
          return NextResponse.redirect(new URL('/dashboard/onboarding', request.url));
        }
      }
    } catch (error) {
      console.warn('Session check failed in middleware:', error);
      // Continue to auth page if session check fails
    }
  }

  // Add performance monitoring headers
  const response = NextResponse.next();
  const duration = Date.now() - startTime;
  response.headers.set('X-Response-Time', `${duration}ms`);
  
  return response;
}

export const config = {
  // Remove /api/auth/:path* and dashboard routes from matcher to prevent blocking
  // Let client-side useSession() handle session fetching without middleware interference
  // Middleware only handles auth page redirects now
  matcher: [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password'
  ],
  // Force middleware to run in Node.js runtime (not Edge runtime)
  // Required for Prisma, bcrypt, and crypto compatibility
  runtime: 'nodejs'
};