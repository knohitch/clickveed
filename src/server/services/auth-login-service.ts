import { AuthError } from 'next-auth';

import { signIn } from '@/auth';
import prisma from '@/server/prisma';

type LoginInput = {
  email?: string | null;
  password?: string | null;
};

type LoginResult = {
  error: string;
  success: boolean;
  redirectUrl?: string;
  userRole?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  needsVerification?: boolean;
  retryAfter?: number;
  databaseError?: boolean;
};

const loginAttemptsStore = new Map<string, { count: number; resetTime: number }>();

function checkLoginRateLimit(email: string): { limited: boolean; retryAfter?: number } {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 5;

  const key = `login:${email.toLowerCase()}`;
  const record = loginAttemptsStore.get(key);

  if (!record || now > record.resetTime) {
    loginAttemptsStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { limited: false };
  }

  if (record.count >= maxAttempts) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { limited: true, retryAfter };
  }

  record.count += 1;
  return { limited: false };
}

function clearLoginRateLimit(email: string): void {
  loginAttemptsStore.delete(`login:${email.toLowerCase()}`);
}

export async function loginWithCredentials({ email, password }: LoginInput): Promise<LoginResult> {
  try {
    const normalizedEmail = (email || '').trim();
    const normalizedPassword = password || '';

    if (!normalizedEmail || !normalizedPassword) {
      return { error: 'Email and password are required.', success: false };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return { error: 'Please enter a valid email address.', success: false };
    }

    const rateLimit = checkLoginRateLimit(normalizedEmail);
    if (rateLimit.limited) {
      return {
        error: `Too many failed login attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
        success: false,
        retryAfter: rateLimit.retryAfter,
      };
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { emailVerified: true, status: true, role: true },
    });

    if (!user) {
      return { error: 'Invalid email or password', success: false };
    }

    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    if (user.emailVerified === false && !isSuperAdmin) {
      return {
        error: 'Please verify your email address before logging in. Check your email for the verification link.',
        success: false,
        needsVerification: true,
      };
    }

    if (user.status !== 'Active') {
      return {
        error: 'Your account is not active. Please contact support.',
        success: false,
      };
    }

    const callbackUrl =
      user.role === 'SUPER_ADMIN'
        ? '/chin/dashboard'
        : user.role === 'ADMIN'
          ? '/kanri/dashboard'
          : '/dashboard';

    const signInResult = await signIn('credentials', {
      email: normalizedEmail,
      password: normalizedPassword,
      redirect: false,
      callbackUrl,
    });

    if (signInResult?.error) {
      return { error: 'Invalid email or password', success: false };
    }

    clearLoginRateLimit(normalizedEmail);

    return {
      success: true,
      error: '',
      redirectUrl: callbackUrl,
      userRole: user.role as 'USER' | 'ADMIN' | 'SUPER_ADMIN',
    };
  } catch (error: any) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Invalid email or password. Please check your credentials and try again.', success: false };
        case 'CallbackRouteError':
          return { error: 'Authentication callback failed. Please try again.', success: false };
        case 'AccessDenied':
          return { error: 'Access denied. Please contact support if this persists.', success: false };
        default:
          return { error: 'An authentication error occurred. Please try again.', success: false };
      }
    }

    if (error?.code === 'P1001' || error?.message?.includes("Can't reach database server")) {
      return {
        error: 'Database connection failed. Please check if the database server is running and accessible.',
        success: false,
        databaseError: true,
      };
    }

    if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
      return {
        error: 'Unable to connect to authentication service. Please check your connection.',
        success: false,
      };
    }

    return { error: 'An unexpected error occurred during login. Please try again.', success: false };
  }
}
