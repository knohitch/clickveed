import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { getAdminSettings } from '@/server/actions/admin-actions';
import { storageManager } from '@/lib/storage';
import IORedis from 'ioredis';
import { resolveRedisConnectionInfo } from '@/lib/redis-config';

/**
 * Comprehensive Diagnostic Endpoint
 * 
 * Use this to diagnose production issues with:
 * - Database connectivity
 * - Environment variables
 * - Email configuration
 * - Storage configuration
 * - Authentication setup
 * 
 * GET /api/diagnostics
 * Add ?secret=YOUR_AUTH_SECRET for full details
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  // Basic security - require secret to see full details
  const isAuthorized = secret === process.env.AUTH_SECRET || secret === process.env.NEXTAUTH_SECRET;
  
  const start = Date.now();
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    serverTime: {
      utc: new Date().toUTCString(),
      iso: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    checks: {},
  };

  // 1. Environment Variables Check
  const envVars = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ? (isAuthorized ? process.env.NEXTAUTH_URL : 'SET') : 'NOT SET',
    AUTH_URL: process.env.AUTH_URL ? (isAuthorized ? process.env.AUTH_URL : 'SET') : 'NOT SET',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ? (isAuthorized ? process.env.NEXT_PUBLIC_SITE_URL : 'SET') : 'NOT SET',
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    ENCRYPTION_KEY: !!process.env.ENCRYPTION_KEY,
    REDIS_URL: !!process.env.REDIS_URL,
    REDIS_HOST: process.env.REDIS_HOST ? (isAuthorized ? process.env.REDIS_HOST : 'SET') : 'NOT SET',
    REDIS_PORT: process.env.REDIS_PORT || 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    WASABI_ACCESS_KEY_ID: !!process.env.WASABI_ACCESS_KEY_ID,
    WASABI_SECRET_ACCESS_KEY: !!process.env.WASABI_SECRET_ACCESS_KEY,
    WASABI_BUCKET: process.env.WASABI_BUCKET || 'NOT SET',
    WASABI_ENDPOINT: process.env.WASABI_ENDPOINT || 'NOT SET',
  };
  
  diagnostics.checks.environment = {
    status: (envVars.DATABASE_URL && (envVars.AUTH_SECRET || envVars.NEXTAUTH_SECRET)) ? 'healthy' : 'critical',
    variables: envVars,
    issues: [],
  };
  
  if (!envVars.DATABASE_URL) {
    diagnostics.checks.environment.issues.push('DATABASE_URL not set - database will not work');
  }
  if (!envVars.AUTH_SECRET && !envVars.NEXTAUTH_SECRET) {
    diagnostics.checks.environment.issues.push('AUTH_SECRET/NEXTAUTH_SECRET not set - authentication will fail');
  }
  if (envVars.NEXTAUTH_URL === 'NOT SET' && envVars.AUTH_URL === 'NOT SET' && envVars.NEXT_PUBLIC_SITE_URL === 'NOT SET') {
    diagnostics.checks.environment.issues.push('No base URL configured - email verification links will fail');
  }

  // 2. Database Check
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    
    // Check for Free plan
    const freePlan = await prisma.plan.findFirst({ 
      where: { 
        OR: [
          { name: 'Free' },
          { featureTier: 'free' }
        ]
      } 
    });
    
    // Get user count
    const userCount = await prisma.user.count();
    
    // Get pending verification tokens
    const pendingTokens = await prisma.verificationToken.count();
    const expiredTokens = await prisma.verificationToken.count({
      where: { expires: { lt: new Date() } }
    });
    
    diagnostics.checks.database = {
      status: freePlan ? 'healthy' : 'warning',
      latency: Date.now() - dbStart,
      freePlanExists: !!freePlan,
      freePlanId: freePlan?.id || null,
      userCount,
      pendingVerificationTokens: pendingTokens,
      expiredVerificationTokens: expiredTokens,
      issues: [],
    };
    
    if (!freePlan) {
      diagnostics.checks.database.issues.push('Free plan not found - new users cannot sign up');
    }
    if (expiredTokens > 0) {
      diagnostics.checks.database.issues.push(`${expiredTokens} expired verification tokens need cleanup`);
    }
  } catch (error: any) {
    diagnostics.checks.database = {
      status: 'critical',
      error: error.message,
      issues: ['Database connection failed - app will not work'],
    };
  }

  // 2.5 Redis Check
  try {
    const redisInfo = resolveRedisConnectionInfo();

    if (!redisInfo.url) {
      diagnostics.checks.redis = {
        status: 'warning',
        configured: false,
        source: redisInfo.source,
        issues: ['Redis not configured. Set REDIS_URL or REDIS_HOST/REDIS_PORT'],
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
        diagnostics.checks.redis = {
          status: pong === 'PONG' ? 'healthy' : 'critical',
          configured: true,
          source: redisInfo.source,
          latency: Date.now() - redisStart,
          ping: pong,
          issues: pong === 'PONG' ? [] : ['Redis ping returned unexpected response'],
        };
      } finally {
        await redis.quit().catch(() => {});
      }
    }
  } catch (error: any) {
    diagnostics.checks.redis = {
      status: 'critical',
      configured: true,
      error: error.message,
      issues: ['Redis connection failed - queue/rate limit features will fail'],
    };
  }

  // 3. Admin Settings / Email Check
  try {
    const settings = await getAdminSettings();
    
    const emailConfigured = !!(
      settings.emailSettings.smtpHost &&
      settings.emailSettings.smtpUser &&
      settings.emailSettings.smtpPass &&
      settings.emailSettings.fromAdminEmail
    );
    
    diagnostics.checks.email = {
      status: emailConfigured ? 'healthy' : 'warning',
      smtpHost: settings.emailSettings.smtpHost ? (isAuthorized ? settings.emailSettings.smtpHost : 'SET') : 'NOT SET',
      smtpPort: settings.emailSettings.smtpPort || '587',
      smtpSecure: (settings.emailSettings as any).smtpSecure || 'auto',
      smtpUser: settings.emailSettings.smtpUser ? 'SET' : 'NOT SET',
      smtpPass: settings.emailSettings.smtpPass ? 'SET' : 'NOT SET',
      fromEmail: settings.emailSettings.fromAdminEmail || 'NOT SET',
      issues: [],
    };
    
    if (!emailConfigured) {
      diagnostics.checks.email.issues.push('SMTP not fully configured - emails will not send');
    }
    
    // Check email templates
    const requiredTemplates = ['emailVerification', 'passwordReset'];
    const missingTemplates = requiredTemplates.filter(t => !settings.emailTemplates[t as keyof typeof settings.emailTemplates]);
    
    if (missingTemplates.length > 0) {
      diagnostics.checks.email.issues.push(`Missing email templates: ${missingTemplates.join(', ')}`);
    }
  } catch (error: any) {
    diagnostics.checks.email = {
      status: 'error',
      error: error.message,
      issues: ['Failed to load email settings'],
    };
  }

  // 4. Storage Check
  try {
    await storageManager.ensureInitialized();
    const storageConfig = storageManager.getConfig();
    
    diagnostics.checks.storage = {
      status: storageManager.isConfigured() ? 'healthy' : 'warning',
      configured: storageManager.isConfigured(),
      endpoint: storageConfig.wasabi.endpoint || 'NOT SET',
      bucket: storageConfig.wasabi.bucket || 'NOT SET',
      hasAccessKey: !!storageConfig.wasabi.accessKeyId,
      hasSecretKey: !!storageConfig.wasabi.secretAccessKey,
      cdnUrl: storageConfig.bunny.cdnUrl || 'NOT SET',
      issues: [],
    };
    
    if (!storageManager.isConfigured()) {
      diagnostics.checks.storage.issues.push('Wasabi storage not configured - file uploads will fail');
    }
  } catch (error: any) {
    diagnostics.checks.storage = {
      status: 'error',
      error: error.message,
      issues: ['Failed to check storage configuration'],
    };
  }

  // 5. Request Info (for debugging URL issues)
  diagnostics.checks.request = {
    host: request.headers.get('host'),
    forwardedProto: request.headers.get('x-forwarded-proto'),
    forwardedFor: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent')?.substring(0, 100),
    url: request.url,
  };

  // Calculate overall status
  const criticalIssues = Object.values(diagnostics.checks).filter(
    (check: any) => check.status === 'critical'
  ).length;
  const warningIssues = Object.values(diagnostics.checks).filter(
    (check: any) => check.status === 'warning' || check.status === 'error'
  ).length;
  
  diagnostics.summary = {
    overallStatus: criticalIssues > 0 ? 'critical' : warningIssues > 0 ? 'degraded' : 'healthy',
    criticalIssues,
    warningIssues,
    totalChecks: Object.keys(diagnostics.checks).length,
    responseTime: Date.now() - start,
  };

  // Collect all issues
  diagnostics.allIssues = Object.entries(diagnostics.checks)
    .filter(([_, check]: [string, any]) => check.issues?.length > 0)
    .flatMap(([category, check]: [string, any]) => 
      check.issues.map((issue: string) => `[${category}] ${issue}`)
    );

  const statusCode = criticalIssues > 0 ? 503 : 200;
  
  return NextResponse.json(diagnostics, { status: statusCode });
}
