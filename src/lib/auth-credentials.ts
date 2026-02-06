import { compare } from 'bcryptjs';
import { findUserForAuth } from '@/lib/db-utils';
import prisma from './prisma'; // Import Prisma client directly

// CRITICAL: Explicitly set runtime to Node.js to prevent Edge Runtime analysis
// This fixes build errors from bcryptjs not supported in Edge Runtime
export const runtime = 'nodejs';

export async function authorizeCredentials(
  credentials: { email?: string; password?: string } | undefined
) {
  if (!credentials?.email || !credentials?.password) {
    console.log('[AUTH] Missing credentials');
    return null;
  }

  try {
    console.log('[AUTH] Attempting login for:', credentials.email);
    const user = await findUserForAuth(prisma, credentials.email);

    if (!user) {
      console.log('[AUTH] User not found');
      return null;
    }
    if (!user.passwordHash) {
      console.log('[AUTH] No password hash for user');
      return null;
    }

    console.log('[AUTH] Found user:', user.email, 'role:', user.role);
    const isValidPassword = await compare(
      credentials.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      console.log('[AUTH] Password comparison failed');
      return null;
    }

    // SUPER_ADMIN bypasses email verification requirement
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    console.log('[AUTH] Login successful, isSuperAdmin:', isSuperAdmin);

    return {
      id: user.id,
      email: user.email,
      name: user.displayName || '',
      role: user.role || 'USER',
      onboardingComplete: user.onboardingComplete || false,
      status: user.status || 'Active',
      // SUPER_ADMIN bypasses email verification
      emailVerified: isSuperAdmin ? true : (user.emailVerified || false)
    };
  } catch (error) {
    console.error('[AUTH] Error in authorizeCredentials:', error);
    return null;
  }
}
