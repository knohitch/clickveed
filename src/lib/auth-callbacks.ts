import prisma from '@/server/prisma';
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

type OAuthAccount = {
  provider?: string | null;
  providerAccountId?: string | null;
  type?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
  session_state?: unknown;
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

export async function getDefaultFreePlanId(): Promise<string | null> {
  const freePlan = await prisma.plan.findFirst({
    where: {
      OR: [
        { name: 'Free' },
        { featureTier: 'free' },
      ],
    },
    select: { id: true },
  });

  return freePlan?.id || null;
}

export async function syncOAuthUserToDatabase(user: OAuthUser, account: OAuthAccount) {
  if (!user?.email) {
    throw new Error('OAuth sign-in requires an email address.');
  }

  const freePlanId = await getDefaultFreePlanId();
  const derivedDisplayName = user.name?.trim() || user.email.split('@')[0];
  const avatarUrl = user.image || null;

  const existingUser = await prisma.user.findUnique({
    where: { email: user.email },
  });

  const appUser = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          displayName: existingUser.displayName || derivedDisplayName,
          avatarUrl: avatarUrl || existingUser.avatarUrl,
          emailVerified: true,
          status: existingUser.status === 'Pending' ? 'Active' : existingUser.status,
          planId: existingUser.planId || freePlanId || undefined,
        },
      })
    : await prisma.user.create({
        data: {
          email: user.email,
          displayName: derivedDisplayName,
          avatarUrl,
          role: 'USER',
          status: 'Active',
          emailVerified: true,
          onboardingComplete: false,
          planId: freePlanId || undefined,
        },
      });

  if (account?.provider && account?.providerAccountId) {
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        },
      },
      update: {
        userId: appUser.id,
        type: account.type || '',
        access_token: account.access_token ?? null,
        refresh_token: account.refresh_token ?? null,
        expires_at: account.expires_at ?? null,
        token_type: account.token_type ?? null,
        scope: account.scope ?? null,
        id_token: account.id_token ?? null,
        session_state: typeof account.session_state === 'string' ? account.session_state : null,
      },
      create: {
        userId: appUser.id,
        type: account.type || '',
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        access_token: account.access_token ?? null,
        refresh_token: account.refresh_token ?? null,
        expires_at: account.expires_at ?? null,
        token_type: account.token_type ?? null,
        scope: account.scope ?? null,
        id_token: account.id_token ?? null,
        session_state: typeof account.session_state === 'string' ? account.session_state : null,
      },
    });
  }

  user.id = appUser.id;
  user.name = appUser.displayName || user.name || '';
  user.image = appUser.avatarUrl || user.image || null;
  user.role = (appUser.role as 'USER' | 'ADMIN' | 'SUPER_ADMIN') || 'USER';
  user.onboardingComplete = appUser.onboardingComplete || false;
  user.status = appUser.status || 'Active';
  user.emailVerified = appUser.emailVerified || true;
}

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
