import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { createHash } from 'crypto';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  
  console.log('[verify-email] Received verification request, token present:', !!token);
  console.log('[verify-email] Request URL:', request.url);

  if (!token) {
    console.log('[verify-email] No token provided in URL');
    return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
  }

  const hashedToken = createHash('sha256').update(token).digest('hex');
  console.log('[verify-email] Hashed token:', hashedToken.substring(0, 16) + '...');

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
    }
    return NextResponse.redirect(new URL('/login?error=expired_token', request.url));
  }

  console.log('[verify-email] Token valid for user:', verificationToken.identifier);

  await prisma.user.update({
    where: { email: verificationToken.identifier },
    data: { 
      emailVerified: true,
      status: 'Active'
    },
  });

  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: verificationToken.identifier, token: hashedToken } },
  });

  console.log('[verify-email] Email verified successfully for:', verificationToken.identifier);
  const base = process.env.NEXTAUTH_URL || process.env.AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || request.url;
  return NextResponse.redirect(new URL('/login?verified=true', base));
}
