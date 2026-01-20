import NextAuth from 'next-auth';
import { z } from 'zod';
import authConfig from './auth.config';
import type { DefaultSession, User as DefaultUser } from 'next-auth';
import type { JWT } from "next-auth/jwt"

// Fix Bug #13: Lazy load bcryptjs and crypto to avoid loading in Edge Runtime
// These Node.js APIs are not supported in Edge Runtime
// Only import when actually needed (in authorize() function)
// This allows middleware to use auth() without loading Node.js modules

// Define custom types directly in the auth config for co-location and clarity.
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
      onboardingComplete: boolean;
      status: string;
      emailVerified: boolean;
    };
  }

  interface User {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
      onboardingComplete: boolean;
      emailVerified?: boolean | null;
      status?: string;
      passwordHash?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
    onboardingComplete: boolean;
    status: string;
    emailVerified: boolean;
  }
}

// Helper function to safely parse boolean from env
const parseBooleanEnv = (value: string | undefined): boolean => {
  if (!value) return false;
  return value.toLowerCase() === 'true' || value === '1';
};

// Fix Bug #13: Remove PrismaAdapter to fix Edge Runtime incompatibility
// Next.js middleware runs in Edge Runtime
// Prisma doesn't support Edge Runtime
// Since we're using JWT strategy with credentials, we don't need PrismaAdapter
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: parseBooleanEnv(process.env.AUTH_TRUST_HOST),
  // For multiple domain support
  ...(process.env.AUTH_URL && { url: process.env.AUTH_URL }),
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    // The authorized callback is now centralized here for the credentials provider
    async authorized({ auth, request: { nextUrl } }) {
      return !!auth?.user;
    },
    
    async signIn({ user, account }) {
      return true;
    },
    
    // CRITICAL FIX: Add redirect callback to handle role-based redirects
    async redirect({ url, baseUrl }) {
      // If the url is relative or matches baseUrl, use it
      if (url.startsWith('/')) return url;
      // If the url starts with baseUrl, use it
      if (url.startsWith(baseUrl)) return url;
      // Otherwise fallback to baseUrl (which will be handled by signIn callback)
      return baseUrl;
    },
    
    // Fix Bug #7: Add error handling to JWT callback
    // The JWT callback is used to enrich the token with custom data
    async jwt({ token, user, trigger, session }) {
      try {
        // On initial sign-in, add user details to the token
        if (user && user.id) {
          token.id = user.id;
          token.role = user.role || 'USER';
          token.onboardingComplete = user.onboardingComplete || false;
          token.status = user.status || 'Active';
          token.emailVerified = typeof user.emailVerified === 'boolean' ? user.emailVerified : !!user.emailVerified;
        }

        // If the session is updated (e.g., name change, onboarding completion),
        // update the token as well.
        if (trigger === "update" && session) {
          if (session.name) {
            token.name = session.name;
          }
          if (session.onboardingComplete !== undefined) {
            token.onboardingComplete = session.onboardingComplete;
          }
          if (session.status !== undefined) {
            token.status = session.status;
          }
          if (session.emailVerified !== undefined) {
            token.emailVerified = session.emailVerified;
          }
        }

        return token;
      } catch (error) {
        // JWT callback error - log silently
        return token;
      }
    },

    // Fix Bug #7: Add error handling to session callback
    // The session callback uses the token data to populate the session object
    async session({ session, token }) {
      try {
        if (token.id) {
          session.user.id = token.id as string;
        }
        if (token.role) {
          session.user.role = token.role as 'USER' | 'ADMIN' | 'SUPER_ADMIN';
        }
        if (token.onboardingComplete !== undefined) {
          session.user.onboardingComplete = token.onboardingComplete as boolean;
        }
        if (token.status !== undefined) {
          session.user.status = token.status as string;
        }
        if (token.emailVerified !== undefined) {
          session.user.emailVerified = token.emailVerified as boolean;
        }
        return session;
      } catch (error) {
        console.error('Session callback error:', error);
        // Return session even if there's an error to prevent auth failures
        return session;
      }
    },
  },
  providers: [
    ...authConfig.providers.filter(provider => provider.id !== 'credentials'),
    {
      id: 'credentials',
      name: 'credentials',
      type: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials: any) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Fix Bug #13: Lazy import Prisma and bcryptjs only in authorize() (Node.js runtime)
          // This prevents Prisma and bcryptjs from being loaded in Edge Runtime
          const { compare } = await import('bcryptjs');
          const { findUserForAuth } = await import('@/lib/db-utils');
          const prismaModule = await import('../lib/prisma');
          const prisma = prismaModule.default;
          
          // Use optimized database utility with timeout and retry logic

          const user = await findUserForAuth(prisma, credentials.email as string);

          if (!user || !user.passwordHash) {
            return null;
          }
          const isValidPassword = await compare(
            credentials.password as string,
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
      },
    },
  ],
});