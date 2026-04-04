import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { createHash } from 'crypto';
import { createRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// CRITICAL: Explicitly set runtime to Node.js to prevent Edge Runtime analysis
// This fixes build errors from crypto not supported in Edge Runtime
export const runtime = 'nodejs';

const verifyEmailRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many verification attempts. Please try again later.',
});

// Get base URL for redirects - ALWAYS use production URL, never request.url
function getProductionBaseUrl(request: Request): string {
  // Priority: AUTH_URL > NEXT_PUBLIC_SITE_URL > NEXTAUTH_URL
  const baseUrl = process.env.AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;
  
  if (baseUrl) {
    return baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }
  
  // Try to extract from request headers
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  if (host) {
    return `${protocol}://${host}`.replace(/\/$/, '');
  }
  
  // Try to extract from request URL
  try {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  } catch (e) {
    // Ignore
  }
  
  // Fallback for development only
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000';
  }
  
  // In production, this should never happen if env vars are set
  console.error('[verify-email] WARNING: No base URL configured!');
  return ''; // Return empty to prevent incorrect redirects
}

export async function GET(request: Request) {
  const rateLimitResult = verifyEmailRateLimit(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  
  // Use production URL for all redirects
  const baseUrl = getProductionBaseUrl(request);

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/login?error=invalid_token`);
  }

  const hashedToken = createHash('sha256').update(token).digest('hex');

  try {
    const existingToken = await prisma.verificationToken.findFirst({
      where: { token: hashedToken },
    });

    // Check if user is already verified (before checking token validity)
    if (existingToken) {
      const user = await prisma.user.findUnique({
        where: { email: existingToken.identifier },
        select: { emailVerified: true, status: true }
      });
      
      if (user?.emailVerified === true) {
        // Clean up the token since user is already verified
        try {
          await prisma.verificationToken.delete({
            where: { identifier_token: { identifier: existingToken.identifier, token: hashedToken } },
          });
        } catch (e) {
          // Ignore deletion errors
        }
        return NextResponse.redirect(`${baseUrl}/login?verified=true&message=already_verified`);
      }
    }

    // Now check if token is valid (not expired)
    // Fix: Use UTC time for comparison to avoid timezone issues
    const now = new Date();
    const currentUtcTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()));
    
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token: hashedToken,
        expires: { gt: currentUtcTime },
      },
    });

    if (!verificationToken) {
      return NextResponse.redirect(`${baseUrl}/login?error=expired_token`);
    }

    // Update user to verified
    await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { 
        emailVerified: true,
        status: 'Active'
      },
    });

    // Delete the used token
    try {
      await prisma.verificationToken.delete({
        where: { identifier_token: { identifier: verificationToken.identifier, token: hashedToken } },
      });
    } catch (deleteError) {
      console.warn('[verify-email] Failed to delete token (non-critical):', deleteError);
    }
    
    // Redirect to login with success message
    return NextResponse.redirect(`${baseUrl}/login?verified=true`);
    
  } catch (error) {
    console.error('[verify-email] Error during verification:', error);
    // Return more specific error information in development
    const errorMessage = process.env.NODE_ENV !== 'production' && error instanceof Error 
      ? `&details=${encodeURIComponent(error.message)}`
      : '';
    return NextResponse.redirect(`${baseUrl}/login?error=verification_failed${errorMessage}`);
  }
}
