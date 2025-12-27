'use server';

import { compare } from 'bcryptjs';
import prisma from '@lib/prisma';

/**
 * Bug #12 FIX: Edge Runtime bcryptjs issue
 * 
 * This server action handles credential verification in Node.js runtime
 * (not Edge Runtime), which is required for bcryptjs to work properly.
 * 
 * It's called by the credentials provider in src/auth.ts which runs in Edge Runtime.
 */

// Fix Bug #12: Edge Runtime bcryptjs compatibility issue
export interface VerifyCredentialsResult {
  success: boolean;
  user?: {
    id: string;
    email: string | null;
    displayName: string | null;
    role: string; // Use string instead of literal union to match database enum
    onboardingComplete: boolean;
    status: string | null;
    emailVerified: boolean | null;
  };
}

export async function verifyCredentialsAction(
  email: string,
  password: string
): Promise<VerifyCredentialsResult> {
  try {
    // Query user from database
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        passwordHash: true,
        role: true,
        onboardingComplete: true,
        status: true,
        emailVerified: true,
      }
    });

    if (!user || !user.passwordHash) {
      return {
        success: false,
        user: undefined,
      };
    }

    // Verify password
    const isValidPassword = await compare(password, user.passwordHash);

    if (!isValidPassword) {
      return {
        success: false,
        user: undefined,
      };
    }

    // Return user data on success (without password hash)
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        onboardingComplete: user.onboardingComplete || false,
        status: user.status,
        emailVerified: user.emailVerified,
      },
    };
  } catch (error) {
    console.error('Credential verification error:', error);
    return {
      success: false,
      user: undefined,
    };
  }
}
