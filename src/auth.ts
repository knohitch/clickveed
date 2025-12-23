import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { z } from 'zod';
import prisma from '../lib/prisma';
import authConfig from './auth.config';
import type { DefaultSession, User as DefaultUser } from 'next-auth';
import type { JWT } from "next-auth/jwt"
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import type { Adapter } from '@auth/core/adapters';
import { findUserForAuth } from '@/lib/db-utils';


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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'jwt' },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: process.env.AUTH_TRUST_HOST === 'true',
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
    
    
    // Fix Bug #7: Add error handling to JWT callback
    // The JWT callback is used to enrich the token with custom data
    async jwt({ token, user, trigger, session }) {
      try {
        // On initial sign-in, add user details to the token
        if (user && user.id) {
          token.id = user.id;
          token.role = user.role;
          token.onboardingComplete = user.onboardingComplete;
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
        console.error('JWT callback error:', error);
        // Return token even if there's an error to prevent auth failures
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
          (session.user as any).emailVerified = token.emailVerified as boolean;
        }
        console.log('Session callback - user role:', session.user.role, 'status:', session.user.status);
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
          console.error('Missing credentials');
          return null;
        }

        try {
          // Use optimized database utility with timeout and retry logic
          const user = await findUserForAuth(prisma, credentials.email as string);

          if (!user || !user.passwordHash) {
            console.error('User not found or no password hash');
            return null;
          }

          const isValidPassword = await compare(
            credentials.password as string,
            user.passwordHash
          );

          if (!isValidPassword) {
            console.error('Invalid password');
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.displayName || '',
            role: user.role,
            onboardingComplete: user.onboardingComplete || false,
            status: user.status,
            emailVerified: user.emailVerified || false
          };
        } catch (error) {
          console.error('Authorization error:', error);
          return null;
        }
      },
    } as any,
  ],
});
