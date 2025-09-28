
import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { z } from 'zod';
import prisma from '@/lib/prisma'; // Use the raw client for the adapter
import authConfig from './auth.config';
import type { DefaultSession, User as DefaultUser } from 'next-auth';
import type { JWT } from "next-auth/jwt"
import { compare } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import type { Adapter } from '@auth/core/adapters';


// Define custom types directly in the auth config for co-location and clarity.
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
      onboardingComplete: boolean;
    } & DefaultSession['user'];
  }

  interface User {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
      onboardingComplete: boolean;
      emailVerified?: Date | null;
      status?: string;
      passwordHash?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
    onboardingComplete: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'jwt' }, // Use JWT for session strategy
  secret: process.env.AUTH_SECRET,
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
    
    
    // The JWT callback is used to enrich the token with custom data
    async jwt({ token, user, trigger, session }) {
      // On initial sign-in, add user details to the token
      if (user && user.id) {
        token.id = user.id;
        token.role = user.role;
        token.onboardingComplete = user.onboardingComplete;
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
      }
      
      return token;
    },

    // The session callback uses the token data to populate the session object
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      if (token.role) {
        session.user.role = token.role as 'USER' | 'ADMIN' | 'SUPER_ADMIN';
      }
      if (token.onboardingComplete !== undefined) {
        session.user.onboardingComplete = token.onboardingComplete as boolean;
      }
      return session;
    },
  },
  // Ensure the providers array is correctly merged, but override credentials provider
  providers: [
    // Filter out the empty credentials provider from authConfig
    ...authConfig.providers.filter(provider => provider.id !== 'credentials'),
    // Add the properly implemented credentials provider
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
          const user = await prisma.user.findUnique({
            where: { 
              email: credentials.email as string 
            },
            include: {
              plan: true
            }
          });

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

          return {
            id: user.id,
            email: user.email,
            name: user.displayName,
            role: user.role,
            onboardingComplete: user.onboardingComplete || false,
            status: user.status
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    } as any,
  ],
});
