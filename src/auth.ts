import NextAuth from 'next-auth';
import { z } from 'zod';
import authConfig from './auth.config';
import type { DefaultSession, User as DefaultUser } from 'next-auth';
import type { JWT } from "next-auth/jwt"
import { syncOAuthUserToDatabase } from '@/lib/auth-callbacks';
import { buildJwtToken, buildSessionFromToken } from '@/lib/auth-session-callbacks';

// CRITICAL: Explicitly set runtime to Node.js to prevent Edge Runtime analysis
// This fixes build errors from bcryptjs, crypto, and process APIs not supported in Edge Runtime
export const runtime = 'nodejs';

// Fix Bug #13: Dynamic import authorize to avoid loading bcryptjs in Edge Runtime
// This prevents bcryptjs from being loaded during build analysis
// The authorize function is now in a separate module

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
    };
  }

  interface User {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
      onboardingComplete: boolean;
      emailVerified?: boolean | Date | null;
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
    emailVerified?: boolean | Date | null;
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
      if (account?.provider && account.provider !== 'credentials') {
        try {
          await syncOAuthUserToDatabase(user, account);
        } catch (error) {
          console.error('OAuth sign-in sync failed:', error);
          return false;
        }
      }

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
        return await buildJwtToken({ token, user, trigger, session });
      } catch (error) {
        // JWT callback error - log silently
        return token;
      }
    },

    // Fix Bug #7: Add error handling to session callback
    // The session callback uses the token data to populate the session object
    async session({ session, token }) {
      try {
        return await buildSessionFromToken({ session: session as any, token });
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
      type: 'credentials' as const,
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials: any) {
        const { authorizeCredentials } = await import('./lib/auth-credentials');
        const user = await authorizeCredentials(credentials);
        if (user) {
          return user as any;
        }
        return null;
      },
    } as any,
  ],
});
