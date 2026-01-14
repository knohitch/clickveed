import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { createHash } from 'crypto';

// Get base URL for redirects - ALWAYS use production URL, never request.url
function getProductionBaseUrl(): string {
  // Priority: AUTH_URL > NEXT_PUBLIC_SITE_URL > NEXTAUTH_URL
  const baseUrl = process.env.AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;
  
  if (baseUrl) {
    return baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }
  
  // Fallback for development only
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000';
  }
  
  // In production, this should never happen if env vars are set
  console.error('[verify-email] WARNING: No base URL configured!');
  return 'https://app.vyydecourt.site'; // Hardcoded fallback
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  
  // Use production URL for all redirects
  const baseUrl = getProductionBaseUrl();
  
  console.log('[verify-email] Received verification request, token present:', !!token);
  console.log('[verify-email] Base URL for redirects:', baseUrl);

  if (!token) {
    console.log('[verify-email] No token provided in URL');
    return NextResponse.redirect(`${baseUrl}/login?error=invalid_token`);
  }

  const hashedToken = createHash('sha256').update(token).digest('hex');
  console.log('[verify-email] Hashed token:', hashedToken.substring(0, 16) + '...');

  try {
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token: hashedToken,
        expires: { gt: new Date() },
      },
    });

    if (!verificationToken) {
      console.log('[verify-email] Token not found or expired');
      
      // Check if token exists but is expired
      const expiredToken = await prisma.verificationToken.findFirst({
        where: { token: hashedToken },
      });
      
      if (expiredToken) {
        console.log('[verify-email] Token exists but is expired, expired at:', expiredToken.expires);
        
        // Check if user is already verified
        const user = await prisma.user.findUnique({
          where: { email: expiredToken.identifier },
          select: { emailVerified: true, status: true }
        });
        
        if (user?.emailVerified === true) {
          console.log('[verify-email] User already verified, redirecting to success');
          return NextResponse.redirect(`${baseUrl}/login?verified=true&message=already_verified`);
        }
      }
      
      return NextResponse.redirect(`${baseUrl}/login?error=expired_token`);
    }

    console.log('[verify-email] Token valid for user:', verificationToken.identifier);

    // Update user to verified
    await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { 
        emailVerified: true,
        status: 'Active'
      },
    });

    // Delete the used token
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: verificationToken.identifier, token: hashedToken } },
    });

    console.log('[verify-email] Email verified successfully for:', verificationToken.identifier);
    
    // Redirect to login with success message
    return NextResponse.redirect(`${baseUrl}/login?verified=true`);
    
  } catch (error) {
    console.error('[verify-email] Error during verification:', error);
    return NextResponse.redirect(`${baseUrl}/login?error=verification_failed`);
  }
}
