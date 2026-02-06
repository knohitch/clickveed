import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { createHash } from 'crypto';

// CRITICAL: Explicitly set runtime to Node.js to prevent Edge Runtime analysis
// This fixes build errors from crypto not supported in Edge Runtime
export const runtime = 'nodejs';

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
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  
  // Use production URL for all redirects
  const baseUrl = getProductionBaseUrl(request);
  
  console.log('[verify-email] Received verification request');
  console.log('[verify-email] Token present:', !!token);
  console.log('[verify-email] Base URL for redirects:', baseUrl);
  console.log('[verify-email] Current server time:', new Date().toISOString());

  if (!token) {
    console.log('[verify-email] No token provided in URL');
    return NextResponse.redirect(`${baseUrl}/login?error=invalid_token`);
  }

  const hashedToken = createHash('sha256').update(token).digest('hex');
  console.log('[verify-email] Hashed token prefix:', hashedToken.substring(0, 16) + '...');

  try {
    // CRITICAL FIX: First check if the token exists at all
    const existingToken = await prisma.verificationToken.findFirst({
      where: { token: hashedToken },
    });
    
    console.log('[verify-email] Token found in DB:', !!existingToken);
    if (existingToken) {
      console.log('[verify-email] Token expires at:', existingToken.expires);
      console.log('[verify-email] Token identifier (email):', existingToken.identifier);
      console.log('[verify-email] Is token expired:', new Date() > existingToken.expires);
    }

    // Check if user is already verified (before checking token validity)
    if (existingToken) {
      const user = await prisma.user.findUnique({
        where: { email: existingToken.identifier },
        select: { emailVerified: true, status: true }
      });
      
      if (user?.emailVerified === true) {
        console.log('[verify-email] User already verified, cleaning up token');
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
    
    console.log('[verify-email] Current UTC time:', currentUtcTime.toISOString());
    
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token: hashedToken,
        expires: { gt: currentUtcTime },
      },
    });

    if (!verificationToken) {
      console.log('[verify-email] Token not found or expired');
      
      if (existingToken) {
        // Token exists but is expired
        console.log('[verify-email] Token exists but expired at:', existingToken.expires);
        console.log('[verify-email] Time difference (minutes):', 
          Math.round((new Date().getTime() - existingToken.expires.getTime()) / 60000));
      } else {
        console.log('[verify-email] Token not found in database at all');
      }
      
      return NextResponse.redirect(`${baseUrl}/login?error=expired_token`);
    }

    console.log('[verify-email] Token valid for user:', verificationToken.identifier);

    // Update user to verified
    const updatedUser = await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { 
        emailVerified: true,
        status: 'Active'
      },
    });
    
    console.log('[verify-email] User updated:', updatedUser.email, 'emailVerified:', updatedUser.emailVerified);

    // Delete the used token
    try {
      await prisma.verificationToken.delete({
        where: { identifier_token: { identifier: verificationToken.identifier, token: hashedToken } },
      });
      console.log('[verify-email] Token deleted successfully');
    } catch (deleteError) {
      console.warn('[verify-email] Failed to delete token (non-critical):', deleteError);
    }

    console.log('[verify-email] Email verified successfully for:', verificationToken.identifier);
    
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
