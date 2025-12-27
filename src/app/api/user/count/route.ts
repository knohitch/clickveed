import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { createRateLimit } from '@/lib/rate-limit';

// This endpoint is intentionally public for the super admin signup page
// to check if super admin already exists. It only returns a count, 
// which is not sensitive information.

// Rate limiter: 10 requests per minute
const countRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Too many requests'
});

export async function GET(request: Request) {
  // Apply rate limiting
  const rateLimitResult = countRateLimit(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const count = await prisma.user.count();
    return NextResponse.json({ count }, { status: 200 });
  } catch (error) {
    console.error('Error counting users:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
