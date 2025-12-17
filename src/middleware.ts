import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from './auth';


export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  
  // Add timeout for auth-related requests
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = NextResponse.next();
      clearTimeout(timeoutId);
      
      // Add performance headers
      const duration = Date.now() - startTime;
      response.headers.set('X-Response-Time', `${duration}ms`);
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Middleware timeout or error:', error);
      
      return new NextResponse(
        JSON.stringify({ error: 'Request timeout' }),
        { 
          status: 408,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // Handle auth pages with session check
  if (request.nextUrl.pathname.startsWith('/login') || 
      request.nextUrl.pathname.startsWith('/signup') ||
      request.nextUrl.pathname.startsWith('/forgot-password') ||
      request.nextUrl.pathname.startsWith('/reset-password')) {
    
    try {
      // Quick session check with a shorter timeout
      const sessionPromise = auth();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session check timeout')), 2000)
      );
      
      const session = await Promise.race([sessionPromise, timeoutPromise]) as any;
      
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

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/chin') ||
      request.nextUrl.pathname.startsWith('/kanri')) {

    try {
      const session = await auth();

      if (!session?.user) {
        // Redirect unauthenticated users to login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', request.url);
        return NextResponse.redirect(loginUrl);
      }

      // Check if user account is pending verification (but allow access to verify-pending page)
      if (session.user.status === 'Pending' &&
          !request.nextUrl.pathname.startsWith('/dashboard/verify-pending') &&
          !request.nextUrl.pathname.startsWith('/dashboard/settings')) {
        // Redirect pending users to verification pending page
        return NextResponse.redirect(new URL('/dashboard/verify-pending', request.url));
      }

      // Check role-based access
      if (request.nextUrl.pathname.startsWith('/chin') && session.user.role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }

      if (request.nextUrl.pathname.startsWith('/kanri') && session.user.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    } catch (error) {
      console.error('Authentication check failed in middleware:', error);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Add performance monitoring headers
  const response = NextResponse.next();
  const duration = Date.now() - startTime;
  response.headers.set('X-Response-Time', `${duration}ms`);
  
  return response;
}

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/dashboard/:path*',
    '/chin/:path*',
    '/kanri/:path*'
  ]
};
