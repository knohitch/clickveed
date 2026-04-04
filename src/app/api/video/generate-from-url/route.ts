import { NextResponse } from 'next/server';
import { createRateLimit } from '@/lib/rate-limit';
import { generateStructuredOutput } from '@/lib/ai/api-service-manager';
import { auth } from '@/auth';
import { checkUserFeatureAccess } from '@/server/actions/feature-access-actions';
import { consumeAICredits } from '@/server/actions/ai-credits-actions';
import { getRedisUrl } from '@/lib/redis-config';
import IORedis from 'ioredis';
import { assertSafeExternalUrl } from '@/server/ai/video-from-url-safety';
import { runVideoFromUrlWorkflow, VideoFromUrlScriptOutputSchema } from '@/server/ai/video-from-url-workflow';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// Rate limiting: 5 requests per minute for video generation
const fallbackRateLimiter = createRateLimit({
  windowMs: 60 * 1000,
  maxRequests: 5,
  message: 'Too many video generation requests. Please try again in a minute.'
});

const redisUrl = getRedisUrl();
const redisClient = redisUrl
  ? new IORedis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 5000,
    })
  : null;

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

async function applyVideoFromUrlRateLimit(request: Request, userId: string): Promise<NextResponse | null> {
  if (!redisClient) {
    return fallbackRateLimiter(request);
  }

  try {
    if (redisClient.status === 'wait') {
      await redisClient.connect();
    }

    const now = Date.now();
    const windowMs = 60 * 1000;
    const maxRequests = 5;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rateKey = `rate:video-from-url:${userId}:${ip}`;
    const windowStart = now - windowMs;

    const pipeline = redisClient.pipeline();
    pipeline.zremrangebyscore(rateKey, 0, windowStart);
    pipeline.zcard(rateKey);
    pipeline.zadd(rateKey, now, `${now}-${Math.random().toString(36).slice(2, 8)}`);
    pipeline.expire(rateKey, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();
    const requestCount = typeof results?.[1]?.[1] === 'number' ? results[1][1] : 0;

    if (requestCount >= maxRequests) {
      const retryAfter = Math.ceil(windowMs / 1000);
      return NextResponse.json(
        {
          error: 'Too many video generation requests. Please try again in a minute.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    return null;
  } catch (error) {
    console.error('Redis rate limit check failed, falling back to in-memory limiter:', error);
    return fallbackRateLimiter(request);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const access = await checkUserFeatureAccess(session.user.id, 'video-from-url');
    if (!access.canAccess) {
      return NextResponse.json({ error: `${access.featureName} is not available on your current plan.` }, { status: 403 });
    }

    const rateLimitResponse = await applyVideoFromUrlRateLimit(request, session.user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    try {
      const result = await runVideoFromUrlWorkflow(await request.json(), {
        assertSafeUrl: assertSafeExternalUrl,
        fetchUrl: async (url) =>
          fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            redirect: 'error',
            signal: createTimeoutSignal(10000),
          }),
        consumeCredits: async () => consumeAICredits(1),
        generateScript: async (prompt) => {
          const generated = await generateStructuredOutput(prompt, VideoFromUrlScriptOutputSchema);
          return {
            output: generated.output ?? undefined,
            provider: generated.provider,
            model: generated.model,
          };
        },
      });

      return NextResponse.json(result.body, { status: result.status });

    } catch (error) {
      console.error('Error generating script from URL:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to generate script' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
