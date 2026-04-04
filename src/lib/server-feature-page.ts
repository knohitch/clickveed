import type { PlanFeature } from '@prisma/client';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { hasFeatureAccess } from '@/server/actions/feature-access-service';
import prisma from '@/server/prisma';

type FeaturePageAccess = {
  canAccess: boolean;
  planName: string | null;
  featureTier: string | null;
  planFeatures: PlanFeature[];
};

export async function getFeaturePageAccess(featureId: string): Promise<FeaturePageAccess> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const [access, user] = await Promise.all([
    hasFeatureAccess(session.user.id, featureId),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        plan: {
          select: {
            name: true,
            featureTier: true,
            features: true,
          },
        },
      },
    }),
  ]);

  return {
    canAccess: access.canAccess,
    planName: user?.plan?.name ?? null,
    featureTier: user?.plan?.featureTier ?? null,
    planFeatures: user?.plan?.features ?? [],
  };
}
