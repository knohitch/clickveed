export interface RedisConnectionInfo {
  url: string | null;
  source: 'REDIS_URL' | 'REDIS_HOST_PORT' | 'none';
}

function safeNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function resolveRedisConnectionInfo(env: NodeJS.ProcessEnv = process.env): RedisConnectionInfo {
  const directUrl = env.REDIS_URL?.trim();
  if (directUrl) {
    const normalized = directUrl.includes('://') ? directUrl : `redis://${directUrl}`;
    return { url: normalized, source: 'REDIS_URL' };
  }

  const host = env.REDIS_HOST?.trim();
  if (!host) {
    return { url: null, source: 'none' };
  }

  const port = safeNumber(env.REDIS_PORT, 6379);
  const db = safeNumber(env.REDIS_DB, 0);
  const username = env.REDIS_USERNAME?.trim();
  const password = env.REDIS_PASSWORD?.trim();
  const protocol = env.REDIS_TLS === 'true' ? 'rediss' : 'redis';

  const authPart = username || password
    ? `${encodeURIComponent(username || '')}:${encodeURIComponent(password || '')}@`
    : '';

  return {
    url: `${protocol}://${authPart}${host}:${port}/${db}`,
    source: 'REDIS_HOST_PORT',
  };
}

export function getRedisUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  return resolveRedisConnectionInfo(env).url;
}
