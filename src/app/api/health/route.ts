import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';

/**
 * Health check endpoint for monitoring application status
 */
export async function GET() {
  const checks: Record<string, any> = {
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
  const isHealthy = Object.values(checks.checks).every((check: any) => 
    check.status !== 'unhealthy'
  );

  if (!isHealthy) {
    checks.status = 'unhealthy';
  }

  return NextResponse.json(checks, {
    status: isHealthy ? 200 : 503
  });
}
