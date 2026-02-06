import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { hash } from 'bcryptjs';
import { createRateLimit } from '@/lib/rate-limit';

// CRITICAL: Explicitly set runtime to Node.js to prevent Edge Runtime analysis
// This fixes build errors from bcryptjs not supported in Edge Runtime
export const runtime = 'nodejs';

// Rate limiter: 5 signup attempts per hour per IP
const signupRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
  message: 'Too many signup attempts. Please try again later.'
});

export async function POST(request: Request) {
  // Apply rate limiting
  const rateLimitResult = signupRateLimit(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    // Check if there are any existing users
    const userCount = await prisma.user.count();
    
    // If there are existing users, don't allow Super Admin signup
    if (userCount > 0) {
      return NextResponse.json(
        { error: 'Super Admin account already exists. Please use the login page.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, email, password } = body;

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required.' },
        { status: 400 }
      );
    }

    // Check if user already exists (shouldn't happen but just in case)
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hash(password, 10);

    // Find the default "Free" plan
    const freePlan = await prisma.plan.findFirst({
      where: { name: 'Free' },
    });

    if (!freePlan) {
      return NextResponse.json(
        { error: "Default 'Free' plan not found. Please seed the database." },
        { status: 500 }
      );
    }

    // Create Super Admin user
    const user = await prisma.user.create({
      data: {
        displayName: name,
        email,
        passwordHash,
        role: 'SUPER_ADMIN',
        status: 'Active', // Super Admin bypasses email verification
        planId: freePlan.id,
      },
    });

    return NextResponse.json(
      { message: 'Super Admin account created successfully.', user: { id: user.id, name: user.displayName, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating Super Admin account:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
