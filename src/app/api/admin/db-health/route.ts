import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { getAdminSettings } from '@/server/actions/admin-actions';
import IORedis from 'ioredis';
import { resolveRedisConnectionInfo } from '@/lib/redis-config';

/**
 * Production Database Health Check Endpoint
 * 
 * Use this endpoint to monitor database health in production.
 * Include it in your monitoring system or load balancer health checks.
 * 
 * GET /api/admin/db-health
 */

export async function GET(request: Request) {
  const start = Date.now();
  const checks: Record<string, any> = {};
  let allHealthy = true;

  // Check 1: Database Connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy', latency: Date.now() - start };
  } catch (error: any) {
    checks.database = { status: 'unhealthy', error: error.message };
    allHealthy = false;
  }

  // Check 2: Required Plans Exist
  try {
    const freePlan = await prisma.plan.findFirst({ where: { name: 'Free' } });
    checks.plans = {
      status: freePlan ? 'healthy' : 'warning',
      message: freePlan ? 'Free plan exists' : 'No Free plan found',
      freePlanId: freePlan?.id || null,
    };
    if (!freePlan) allHealthy = false;
  } catch (error: any) {
    checks.plans = { status: 'error', error: error.message };
    allHealthy = false;
  }

  // Check 3: Redis Connection (optional for some features, required for queue/rate limit)
  try {
    const redisInfo = resolveRedisConnectionInfo();

    if (!redisInfo.url) {
      checks.redis = {
        status: 'warning',
        message: 'Redis not configured. Set REDIS_URL or REDIS_HOST/REDIS_PORT for queue/rate-limit features.',
        source: redisInfo.source,
      };
    } else {
      const redisStart = Date.now();
      const redis = new IORedis(redisInfo.url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
      });

      try {
        await redis.connect();
        const pong = await redis.ping();

        checks.redis = {
          status: pong === 'PONG' ? 'healthy' : 'unhealthy',
          latency: Date.now() - redisStart,
          source: redisInfo.source,
          message: `Redis ping: ${pong}`,
        };

        if (pong !== 'PONG') allHealthy = false;
      } finally {
        await redis.quit().catch(() => {});
      }
    }
  } catch (error: any) {
    checks.redis = { status: 'unhealthy', error: error.message };
    allHealthy = false;
  }

  // Check 4: Admin Settings
  try {
    const settings = await getAdminSettings();
    checks.settings = {
      status: 'healthy',
      appName: settings.appName,
      hasEmailSettings: !!settings.emailSettings.smtpHost,
    };
  } catch (error: any) {
    checks.settings = { status: 'error', error: error.message };
    allHealthy = false;
  }

  // Check 5: Email Templates
  try {
    const templates = await prisma.emailTemplate.findMany();
    checks.emailTemplates = {
      status: 'healthy',
      count: templates.length,
      requiredTemplates: ['emailVerification', 'passwordReset', 'subscriptionActivated'],
      missingTemplates: ['emailVerification', 'passwordReset', 'subscriptionActivated'].filter(
        t => !templates.find(tmpl => tmpl.key === t)
      ),
    };
  } catch (error: any) {
    checks.emailTemplates = { status: 'error', error: error.message };
  }

  // Check 6: User Count (for reference)
  try {
    const userCount = await prisma.user.count();
    checks.users = {
      status: 'healthy',
      totalUsers: userCount,
    };
  } catch (error: any) {
    checks.users = { status: 'error', error: error.message };
  }

  // Calculate overall health
  const healthyChecks = Object.values(checks).filter((c: any) => c.status === 'healthy').length;
  const totalChecks = Object.keys(checks).length;
  const healthScore = Math.round((healthyChecks / totalChecks) * 100);

  const response = {
    status: allHealthy ? 'healthy' : healthScore >= 70 ? 'degraded' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
    summary: {
      totalChecks,
      healthyChecks,
      healthScore,
    },
  };

  const statusCode = healthScore >= 90 ? 200 : healthScore >= 70 ? 200 : 503;
  
  return NextResponse.json(response, { status: statusCode });
}
