import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from './auth';


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ONLY redirect unauthenticated users from dashboard routes
  // DO NOT redirect authenticated users away from login - let NextAuth handle it
  
  // Protect Super Admin routes
  if (pathname.startsWith('/chin')) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Protect Admin routes
  if (pathname.startsWith('/kanri')) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Protect User dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/chin/:path*',
    '/kanri/:path*',
    '/dashboard/:path*'
  ],
  runtime: 'nodejs'
};