import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { createHash } from 'crypto';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
  }

  const hashedToken = createHash('sha256').update(token).digest('hex');

  const verificationToken = await prisma.verificationToken.findFirst({
    where: {
      token: hashedToken,
      expires: { gt: new Date() },
    },
  });

  if (!verificationToken) {
    return NextResponse.redirect(new URL('/login?error=expired_token', request.url));
  }

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

  return NextResponse.redirect(new URL('/login?verified=true', request.url));
}
