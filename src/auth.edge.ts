import NextAuth from 'next-auth';
import authConfig from './auth.config';
import { buildJwtToken, buildSessionFromToken } from '@/lib/auth-session-callbacks';

const parseBooleanEnv = (value: string | undefined): boolean => {
  if (!value) return false;
  return value.toLowerCase() === 'true' || value === '1';
};

export const { auth } = NextAuth({
  ...authConfig,
  session: { strategy: 'jwt' },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: parseBooleanEnv(process.env.AUTH_TRUST_HOST),
  ...(process.env.AUTH_URL && { url: process.env.AUTH_URL }),
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      return buildJwtToken({ token, user, trigger, session });
    },
    async session({ session, token }) {
      return buildSessionFromToken({ session: session as any, token });
    },
  },
});

