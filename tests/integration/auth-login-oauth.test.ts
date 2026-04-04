import assert from 'node:assert/strict';
import { afterEach, describe, mock, test } from 'node:test';

import { hashSync } from 'bcryptjs';
import * as prismaRuntimeModule from '../../src/server/prisma';
import { authorizeCredentials, authorizeUserRecord } from '@/lib/auth-credentials';
import {
  buildJwtToken,
  buildSessionFromToken,
  syncOAuthUserToDatabase,
} from '@/lib/auth-callbacks';

const prisma: any =
  (prismaRuntimeModule as any).default?.default ??
  (prismaRuntimeModule as any).default ??
  prismaRuntimeModule;

const restorers: Array<() => void> = [];

function replaceMethod<T extends object, K extends keyof T>(target: T, key: K, replacement: T[K]) {
  const original = target[key];
  target[key] = replacement;
  restorers.push(() => {
    target[key] = original;
  });
}

afterEach(() => {
  mock.restoreAll();
  while (restorers.length > 0) {
    restorers.pop()?.();
  }
});

describe('login and oauth auth contracts', () => {
  test('credentials login returns the shaped user for a valid password', async () => {
    const result = await authorizeUserRecord({
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'Demo User',
      passwordHash: hashSync('correct-password', 4),
      role: 'USER',
      onboardingComplete: true,
      status: 'Active',
      emailVerified: true,
    }, 'correct-password');

    assert.deepEqual(result, {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Demo User',
      role: 'USER',
      onboardingComplete: true,
      status: 'Active',
      emailVerified: true,
    });
  });

  test('credentials login lets super admins bypass email verification', async () => {
    const result = await authorizeUserRecord({
      id: 'admin-1',
      email: 'admin@example.com',
      displayName: 'Root Admin',
      passwordHash: hashSync('correct-password', 4),
      role: 'SUPER_ADMIN',
      onboardingComplete: false,
      status: 'Active',
      emailVerified: false,
    }, 'correct-password');

    assert.equal(result?.role, 'SUPER_ADMIN');
    assert.equal(result?.emailVerified, true);
  });

  test('credentials login rejects an invalid password', async () => {
    const result = await authorizeUserRecord({
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'Demo User',
      passwordHash: hashSync('correct-password', 4),
      role: 'USER',
      onboardingComplete: false,
      status: 'Active',
      emailVerified: false,
    }, 'wrong-password');

    assert.equal(result, null);
  });

  test('credentials login rejects missing credentials before any lookup', async () => {
    const result = await authorizeCredentials(undefined);
    assert.equal(result, null);
  });

  test('oauth sync creates a new app user and provider account', async () => {
    replaceMethod(prisma.plan, 'findFirst', (async () => ({ id: 'plan-free' })) as any);
    replaceMethod(prisma.user, 'findUnique', (async () => null) as any);

    let createdUserData: any = null;
    replaceMethod(prisma.user, 'create', (async ({ data }: any) => {
      createdUserData = data;
      return {
        id: 'user-new',
        ...data,
      };
    }) as any);

    let upsertArgs: any = null;
    replaceMethod(prisma.account, 'upsert', (async (args: any) => {
      upsertArgs = args;
      return args;
    }) as any);

    const oauthUser: any = {
      email: 'oauth@example.com',
      name: 'OAuth Demo',
      image: 'https://cdn.example.com/avatar.png',
    };
    const account: any = {
      provider: 'google',
      providerAccountId: 'google-account-1',
      type: 'oauth',
      access_token: 'token',
    };

    await syncOAuthUserToDatabase(oauthUser, account);

    assert.equal(createdUserData.email, 'oauth@example.com');
    assert.equal(createdUserData.displayName, 'OAuth Demo');
    assert.equal(createdUserData.planId, 'plan-free');
    assert.equal(upsertArgs.create.userId, 'user-new');
    assert.equal(oauthUser.id, 'user-new');
    assert.equal(oauthUser.role, 'USER');
  });

  test('oauth sync upgrades pending users and preserves existing display names', async () => {
    replaceMethod(prisma.plan, 'findFirst', (async () => ({ id: 'plan-free' })) as any);
    replaceMethod(prisma.user, 'findUnique', (async () => ({
      id: 'user-existing',
      email: 'oauth@example.com',
      displayName: 'Existing Name',
      avatarUrl: null,
      status: 'Pending',
      planId: null,
      role: 'USER',
      onboardingComplete: true,
      emailVerified: false,
    })) as any);

    let updatedUserData: any = null;
    replaceMethod(prisma.user, 'update', (async ({ data }: any) => {
      updatedUserData = data;
      return {
        id: 'user-existing',
        email: 'oauth@example.com',
        displayName: 'Existing Name',
        avatarUrl: 'https://cdn.example.com/avatar.png',
        status: 'Active',
        planId: 'plan-free',
        role: 'USER',
        onboardingComplete: true,
        emailVerified: true,
      };
    }) as any);
    replaceMethod(prisma.account, 'upsert', (async () => ({})) as any);

    const oauthUser: any = {
      email: 'oauth@example.com',
      name: 'Fresh OAuth Name',
      image: 'https://cdn.example.com/avatar.png',
    };

    await syncOAuthUserToDatabase(oauthUser, {
      provider: 'google',
      providerAccountId: 'google-account-1',
      type: 'oauth',
    });

    assert.equal(updatedUserData.displayName, 'Existing Name');
    assert.equal(updatedUserData.status, 'Active');
    assert.equal(updatedUserData.planId, 'plan-free');
    assert.equal(oauthUser.name, 'Existing Name');
    assert.equal(oauthUser.status, 'Active');
  });

  test('jwt and session shaping keep auth state aligned for the app session', async () => {
    const token = await buildJwtToken({
      token: {} as any,
      user: {
        id: 'user-1',
        role: 'ADMIN',
        onboardingComplete: true,
        status: 'Active',
        emailVerified: true,
      },
    });

    assert.deepEqual(token, {
      id: 'user-1',
      role: 'ADMIN',
      onboardingComplete: true,
      status: 'Active',
      emailVerified: true,
    });

    const updatedToken = await buildJwtToken({
      token,
      trigger: 'update',
      session: {
        name: 'Updated Name',
        onboardingComplete: false,
        status: 'Paused',
        emailVerified: false,
      },
    });

    assert.equal(updatedToken.name, 'Updated Name');
    assert.equal(updatedToken.onboardingComplete, false);
    assert.equal(updatedToken.status, 'Paused');
    assert.equal(updatedToken.emailVerified, false);

    const session = await buildSessionFromToken({
      session: {
        user: {} as any,
      } as any,
      token: updatedToken,
    });

    assert.deepEqual(session.user, {
      id: 'user-1',
      role: 'ADMIN',
      onboardingComplete: false,
      status: 'Paused',
    });
  });
});
