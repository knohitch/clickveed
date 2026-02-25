import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import IORedis from 'ioredis';
import { resolveRedisConnectionInfo } from '@/lib/redis-config';

/**
 * Health check endpoint for monitoring application status
 */
export async function GET() {
  const checks: {
    timestamp: string;
    status: 'healthy' | 'unhealthy';
    checks: {
      database?: {
        status: 'healthy' | 'unhealthy';
        message?: string;
        error?: string;
      };
      environment?: {
        status: 'healthy' | 'unhealthy';
        message?: string;
        missing?: string[];
      };
      redis?: {
        status: 'healthy' | 'unhealthy';
        message?: string;
        source?: string;
        error?: string;
      };
    };
  } = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {}
  };

  try {
    // Check database connectivity
    const dbCheck = await prisma.$queryRaw`SELECT 1`;
    checks.checks.database = {
      status: 'healthy',
      message: 'Database connection successful'
    };
  } catch (error) {
    checks.status = 'unhealthy';
    checks.checks.database = {
      status: 'unhealthy',
      message: 'Database connection failed',
      error: (error as Error).message
    };
  }

  // Check Redis connectivity (only considered unhealthy if configured and failing)
  const redisInfo = resolveRedisConnectionInfo();
  if (!redisInfo.url) {
    checks.checks.redis = {
      status: 'healthy',
      message: 'Redis not configured (optional)',
      source: redisInfo.source
    };
  } else {
    let redisClient: IORedis | null = null;
    try {
      redisClient = new IORedis(redisInfo.url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
      });
      await redisClient.connect();
      const pong = await redisClient.ping();
      checks.checks.redis = {
        status: pong === 'PONG' ? 'healthy' : 'unhealthy',
        message: `Redis ping: ${pong}`,
        source: redisInfo.source,
      };
      if (pong !== 'PONG') {
        checks.status = 'unhealthy';
      }
    } catch (error) {
      checks.status = 'unhealthy';
      checks.checks.redis = {
        status: 'unhealthy',
        message: 'Redis connection failed',
        source: redisInfo.source,
        error: (error as Error).message,
      };
    } finally {
      if (redisClient) {
        await redisClient.quit().catch(() => {});
      }
    }
  }

  // Check environment variables
  const requiredEnvVars = ['NEXT_PUBLIC_SITE_URL', 'DATABASE_URL'];
  const missingEnvVars: string[] = [];

  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missingEnvVars.push(varName);
    }
  }

  if (missingEnvVars.length > 0) {
    checks.status = 'unhealthy';
    checks.checks.environment = {
      status: 'unhealthy',
      message: 'Missing required environment variables',
      missing: missingEnvVars
    };
  } else {
    checks.checks.environment = {
      status: 'healthy',
      message: 'All required environment variables configured'
    };
  }

  // Overall status check
  const isHealthy = Object.values(checks.checks).every((check: { status: string }) => 
    check.status !== 'unhealthy'
  );

  if (!isHealthy) {
    checks.status = 'unhealthy';
  }

  return NextResponse.json(checks, {
    status: isHealthy ? 200 : 503
  });
}
