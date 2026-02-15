
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import type { NextAuthConfig } from 'next-auth';

// NOTICE: This file is used for NextAuth middleware, so it must not contain any
// server-only imports like the Prisma adapter.

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      // The `authorize` function will be defined in the main `auth.ts` file.
      // We leave it empty here to keep this config Edge-compatible.
      async authorize(credentials) {
        return null;
      },
    }),
  ],
} satisfies NextAuthConfig;
