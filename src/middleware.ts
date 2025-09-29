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
