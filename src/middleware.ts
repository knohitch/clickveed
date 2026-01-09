import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from './auth';


export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;

  // Handle root path - redirect authenticated users, unauthenticated to login
  if (pathname === '/') {
    try {
      const session = await auth();

      if (session?.user) {
        // Redirect authenticated users to appropriate dashboard
        if (session.user.role === 'SUPER_ADMIN') {
          return NextResponse.redirect(new URL('/chin/dashboard', request.url));
        } else if (session.user.role === 'ADMIN') {
          return NextResponse.redirect(new URL('/kanri/dashboard', request.url));
        } else if (session.user.onboardingComplete) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        } else {
          return NextResponse.redirect(new URL('/dashboard/onboarding', request.url));
        }
      }
    } catch (error) {
      console.warn('Session check failed for root path:', error);
      // Continue to login if session check fails
    }

    // Redirect unauthenticated users to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Handle auth pages with session check
  if (pathname.startsWith('/login') ||
      pathname.startsWith('/signup') ||
      pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/reset-password')) {

    try {
      const session = await auth();

      if (session?.user) {
        // Redirect authenticated users away from auth pages
        console.log('Authenticated user with role:', session.user.role);
        if (session.user.role === 'SUPER_ADMIN') {
          return NextResponse.redirect(new URL('/chin/dashboard', request.url));
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
  // Match root path and auth pages for redirects
  // Don't match API routes or dashboard routes to prevent blocking
  matcher: [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password'
  ],
  // Force middleware to run in Node.js runtime (not Edge runtime)
  // Required for Prisma, bcrypt, and crypto compatibility
  runtime: 'nodejs'
};