import prisma from '@/server/prisma';
import { withTimeout } from '@/lib/db-utils';

type CheckStatus = 'healthy' | 'warning' | 'unhealthy' | 'error';

type IntegrityCheck = {
  status: CheckStatus;
  relationMode: 'prisma';
  orphanCounts?: Record<string, number>;
  totalOrphans?: number;
  message?: string;
  recommendation?: string;
  error?: string;
};

type PerformanceProbe = {
  status: CheckStatus;
  latencyMs?: number;
  rowsReturned?: number;
  userId?: string | null;
  message?: string;
  error?: string;
};

type TableMetric = {
  count: number;
  status: CheckStatus;
};

export async function runReferentialIntegrityCheck(): Promise<IntegrityCheck> {
  try {
    const orphanResults = await Promise.all([
      countOrphans(
        'projectsWithoutUser',
        `
          SELECT COUNT(*)::int AS count
          FROM "Project" p
          LEFT JOIN "User" u ON u.id = p."userId"
          WHERE u.id IS NULL
        `
      ),
      countOrphans(
        'videosWithoutProject',
        `
          SELECT COUNT(*)::int AS count
          FROM "Video" v
          LEFT JOIN "Project" p ON p.id = v."projectId"
          WHERE p.id IS NULL
        `
      ),
      countOrphans(
        'transcriptsWithoutVideo',
        `
          SELECT COUNT(*)::int AS count
          FROM "Transcript" t
          LEFT JOIN "Video" v ON v.id = t."videoId"
          WHERE v.id IS NULL
        `
      ),
      countOrphans(
        'mediaAssetsWithoutUser',
        `
          SELECT COUNT(*)::int AS count
          FROM "MediaAsset" m
          LEFT JOIN "User" u ON u.id = m."userId"
          WHERE u.id IS NULL
        `
      ),
      countOrphans(
        'notificationsWithoutUser',
        `
          SELECT COUNT(*)::int AS count
          FROM "Notification" n
          LEFT JOIN "User" u ON u.id = n."userId"
          WHERE u.id IS NULL
        `
      ),
      countOrphans(
        'voiceClonesWithoutUser',
        `
          SELECT COUNT(*)::int AS count
          FROM "VoiceClone" vc
          LEFT JOIN "User" u ON u.id = vc."userId"
          WHERE u.id IS NULL
        `
      ),
      countOrphans(
        'planFeatureAccessWithoutPlan',
        `
          SELECT COUNT(*)::int AS count
          FROM "PlanFeatureAccess" pfa
          LEFT JOIN "Plan" p ON p.id = pfa."planId"
          WHERE p.id IS NULL
        `
      ),
      countOrphans(
        'planFeatureAccessWithoutDefinition',
        `
          SELECT COUNT(*)::int AS count
          FROM "PlanFeatureAccess" pfa
          LEFT JOIN "FeatureDefinition" fd ON fd."featureId" = pfa."featureId"
          WHERE fd.id IS NULL
        `
      ),
      countOrphans(
        'supportTicketsWithoutUser',
        `
          SELECT COUNT(*)::int AS count
          FROM "SupportTicket" st
          LEFT JOIN "User" u ON u.id = st."userId"
          WHERE st."userId" IS NOT NULL AND u.id IS NULL
        `
      ),
    ]);

    const orphanCounts = Object.fromEntries(orphanResults.map(result => [result.name, result.count]));
    const totalOrphans = orphanResults.reduce((sum, result) => sum + result.count, 0);

    return {
      status: totalOrphans === 0 ? 'healthy' : 'warning',
      relationMode: 'prisma',
      orphanCounts,
      totalOrphans,
      message:
        totalOrphans === 0
          ? 'No orphaned rows detected across monitored relations.'
          : 'Application-enforced relations have drifted. Review and clean orphaned rows.',
      recommendation:
        totalOrphans === 0
          ? 'Continue running orphan checks because relationMode="prisma" does not enforce database-level foreign keys.'
          : 'Investigate delete paths and backfill cleanup jobs for affected models.',
    };
  } catch (error) {
    return {
      status: 'error',
      relationMode: 'prisma',
      error: error instanceof Error ? error.message : 'Unknown integrity check failure',
    };
  }
}

export async function collectTableMetrics(): Promise<Record<string, TableMetric>> {
  const [
    users,
    projects,
    videos,
    transcripts,
    mediaAssets,
    notifications,
    jobs,
    voiceClones,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.video.count(),
    prisma.transcript.count(),
    prisma.mediaAsset.count(),
    prisma.notification.count(),
    prisma.personaAvatarJob.count(),
    prisma.voiceClone.count(),
  ]);

  return {
    users: { count: users, status: 'healthy' },
    projects: { count: projects, status: projects > 100000 ? 'warning' : 'healthy' },
    videos: { count: videos, status: videos > 100000 ? 'warning' : 'healthy' },
    transcripts: { count: transcripts, status: transcripts > 100000 ? 'warning' : 'healthy' },
    mediaAssets: { count: mediaAssets, status: mediaAssets > 250000 ? 'warning' : 'healthy' },
    notifications: { count: notifications, status: notifications > 250000 ? 'warning' : 'healthy' },
    personaAvatarJobs: { count: jobs, status: jobs > 50000 ? 'warning' : 'healthy' },
    voiceClones: { count: voiceClones, status: voiceClones > 50000 ? 'warning' : 'healthy' },
  };
}

export async function runPerformanceProbes(): Promise<Record<string, PerformanceProbe>> {
  const [assetProbe, projectProbe, notificationProbe] = await Promise.all([
    runUserScopedAssetProbe(),
    runProjectListingProbe(),
    runUnreadNotificationProbe(),
  ]);

  return {
    userScopedMediaAssets: assetProbe,
    userProjectListing: projectProbe,
    unreadNotifications: notificationProbe,
  };
}

function statusFromLatency(latencyMs: number, warningThresholdMs: number): CheckStatus {
  return latencyMs > warningThresholdMs ? 'warning' : 'healthy';
}

async function countOrphans(name: string, sql: string): Promise<{ name: string; count: number }> {
  const rows = await withTimeout(
    prisma.$queryRawUnsafe<Array<{ count: number }>>(sql),
    8000,
    `${name} integrity check`
  );

  return {
    name,
    count: Number(rows[0]?.count || 0),
  };
}

async function runUserScopedAssetProbe(): Promise<PerformanceProbe> {
  const candidate = await prisma.mediaAsset.findFirst({
    select: { userId: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!candidate?.userId) {
    return {
      status: 'healthy',
      message: 'Skipped: no media assets available yet.',
      userId: null,
    };
  }

  const startedAt = Date.now();
  try {
    const rows = await withTimeout(
      prisma.mediaAsset.findMany({
        where: { userId: candidate.userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true },
      }),
      5000,
      'User-scoped media asset probe'
    );

    const latencyMs = Date.now() - startedAt;
    return {
      status: statusFromLatency(latencyMs, 400),
      latencyMs,
      rowsReturned: rows.length,
      userId: candidate.userId,
    };
  } catch (error) {
    return {
      status: 'error',
      latencyMs: Date.now() - startedAt,
      userId: candidate.userId,
      error: error instanceof Error ? error.message : 'Unknown media asset probe failure',
    };
  }
}

async function runProjectListingProbe(): Promise<PerformanceProbe> {
  const candidate = await prisma.project.findFirst({
    select: { userId: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (!candidate?.userId) {
    return {
      status: 'healthy',
      message: 'Skipped: no projects available yet.',
      userId: null,
    };
  }

  const startedAt = Date.now();
  try {
    const rows = await withTimeout(
      prisma.project.findMany({
        where: { userId: candidate.userId },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: { id: true },
      }),
      5000,
      'User project listing probe'
    );

    const latencyMs = Date.now() - startedAt;
    return {
      status: statusFromLatency(latencyMs, 300),
      latencyMs,
      rowsReturned: rows.length,
      userId: candidate.userId,
    };
  } catch (error) {
    return {
      status: 'error',
      latencyMs: Date.now() - startedAt,
      userId: candidate.userId,
      error: error instanceof Error ? error.message : 'Unknown project listing probe failure',
    };
  }
}

async function runUnreadNotificationProbe(): Promise<PerformanceProbe> {
  const candidate = await prisma.notification.findFirst({
    select: { userId: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!candidate?.userId) {
    return {
      status: 'healthy',
      message: 'Skipped: no notifications available yet.',
      userId: null,
    };
  }

  const startedAt = Date.now();
  try {
    const rows = await withTimeout(
      prisma.notification.findMany({
        where: {
          userId: candidate.userId,
          isRead: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true },
      }),
      5000,
      'Unread notification probe'
    );

    const latencyMs = Date.now() - startedAt;
    return {
      status: statusFromLatency(latencyMs, 250),
      latencyMs,
      rowsReturned: rows.length,
      userId: candidate.userId,
    };
  } catch (error) {
    return {
      status: 'error',
      latencyMs: Date.now() - startedAt,
      userId: candidate.userId,
      error: error instanceof Error ? error.message : 'Unknown notification probe failure',
    };
  }
}
