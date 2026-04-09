import type { Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

type OAuthUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  onboardingComplete?: boolean;
  emailVerified?: boolean | Date | null;
  status?: string;
};

type JwtCallbackInput = {
  token: JWT;
  user?: OAuthUser;
  trigger?: string;
  session?: Record<string, unknown>;
};

type SessionCallbackInput = {
  session: Session;
  token: JWT;
};

export async function buildJwtToken({ token, user, trigger, session }: JwtCallbackInput): Promise<JWT> {
  if (user && user.id) {
    token.id = user.id;
    token.role = user.role || 'USER';
    token.onboardingComplete = user.onboardingComplete || false;
    token.status = user.status || 'Active';
    token.emailVerified = typeof user.emailVerified === 'boolean' ? user.emailVerified : !!user.emailVerified;
  }

  if (trigger === 'update' && session) {
    const sessionUpdate = session as {
      name?: string;
      onboardingComplete?: boolean;
      status?: string;
      emailVerified?: boolean | Date | null;
    };

    if (sessionUpdate.name) {
      token.name = sessionUpdate.name;
    }
    if (sessionUpdate.onboardingComplete !== undefined) {
      token.onboardingComplete = sessionUpdate.onboardingComplete;
    }
    if (sessionUpdate.status !== undefined) {
      token.status = sessionUpdate.status;
    }
    if (sessionUpdate.emailVerified !== undefined) {
      token.emailVerified = sessionUpdate.emailVerified;
    }
  }

  return token;
}

export async function buildSessionFromToken({ session, token }: SessionCallbackInput): Promise<Session> {
  const user = session.user as Session['user'] & {
    id?: string;
    role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
    onboardingComplete?: boolean;
    status?: string;
  };

  if (token.id) {
    user.id = token.id as string;
  }
  if (token.role) {
    user.role = token.role as 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  }
  if (token.onboardingComplete !== undefined) {
    user.onboardingComplete = token.onboardingComplete as boolean;
  }
  if (token.status !== undefined) {
    user.status = token.status as string;
  }

  return session;
}

