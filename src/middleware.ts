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

  // Protect admin dashboard routes
  if (pathname.startsWith('/chin') || pathname.startsWith('/kanri')) {
    try {
      const session = await auth();

      if (!session?.user) {
        console.log('Unauthenticated user accessing admin route, redirecting to login');
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // Check role-based access
      if (pathname.startsWith('/chin') && session.user.role !== 'SUPER_ADMIN') {
        console.log('Non-SUPER_ADMIN accessing SUPER_ADMIN route, redirecting to user dashboard');
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      if (pathname.startsWith('/kanri') && session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
        console.log('Non-ADMIN accessing ADMIN route, redirecting to user dashboard');
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (error) {
      console.warn('Session check failed for admin route:', error);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Protect user dashboard routes
  if (pathname.startsWith('/dashboard')) {
    try {
      const session = await auth();

      if (!session?.user) {
        console.log('Unauthenticated user accessing dashboard, redirecting to login');
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // Prevent admin users from accessing user dashboard - redirect to appropriate admin dashboard
      if (session.user.role === 'SUPER_ADMIN') {
        console.log('SUPER_ADMIN accessing user dashboard, redirecting to admin dashboard');
        return NextResponse.redirect(new URL('/chin/dashboard', request.url));
      }

      if (session.user.role === 'ADMIN') {
        console.log('ADMIN accessing user dashboard, redirecting to admin dashboard');
        return NextResponse.redirect(new URL('/kanri/dashboard', request.url));
      }
    } catch (error) {
      console.warn('Session check failed for user dashboard:', error);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Add performance monitoring headers
  const response = NextResponse.next();
  const duration = Date.now() - startTime;
  response.headers.set('X-Response-Time', `${duration}ms`);

  return response;
}

export const config = {
  // Match root path, auth pages, and all dashboard routes for protection
  // Don't match API routes to prevent blocking
  matcher: [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/chin/:path*',
    '/kanri/:path*',
    '/dashboard/:path*'
  ],
  // Force middleware to run in Node.js runtime (not Edge runtime)
  // Required for Prisma, bcrypt, and crypto compatibility
  runtime: 'nodejs'
};
