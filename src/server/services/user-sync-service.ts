import 'server-only';

import prisma from '@/server/prisma';
import type { User } from '@prisma/client';

export type UserSyncData = Partial<
  Pick<
    User,
    | 'id'
    | 'email'
    | 'displayName'
    | 'avatarUrl'
    | 'stripeCustomerId'
    | 'stripeSubscriptionId'
    | 'stripeSubscriptionStatus'
    | 'stripePriceId'
    | 'stripeCurrentPeriodEnd'
    | 'onboardingComplete'
    | 'planId'
  >
> & {
  onboardingData?: Record<string, any>;
  name?: string;
  image?: string;
};

export async function syncUserRecord(data: UserSyncData) {
  if (!data.id && !data.email) {
    throw new Error('User ID or email is required to sync user.');
  }

  const { onboardingData, name, image, ...userData } = data;
  const normalizedUserData: Record<string, any> = { ...userData };

  if (name !== undefined) normalizedUserData.displayName = name;
  if (image !== undefined) normalizedUserData.avatarUrl = image;

  if (onboardingData) {
    normalizedUserData.onboardingComplete = true;
    normalizedUserData.onboardingData = onboardingData;
  }

  const whereClause = data.id ? { id: data.id } : { email: data.email! };

  return prisma.user.upsert({
    where: whereClause,
    update: normalizedUserData,
    create: {
      ...normalizedUserData,
      email: data.email!,
      role: 'USER',
      status: 'Active',
    },
  });
}
