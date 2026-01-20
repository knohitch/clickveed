import { compare } from 'bcryptjs';
import { findUserForAuth } from '@/lib/db-utils';
import type { PrismaClient } from '@prisma/client';

export async function authorizeCredentials(
  credentials: { email?: string; password?: string } | undefined,
  prisma: PrismaClient
) {
  if (!credentials?.email || !credentials?.password) {
    return null;
  }

  try {
    const user = await findUserForAuth(prisma, credentials.email);

    if (!user || !user.passwordHash) {
      return null;
    }

    const isValidPassword = await compare(
      credentials.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      return null;
    }

    // SUPER_ADMIN bypasses email verification requirement
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

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
    return null;
  }
}
