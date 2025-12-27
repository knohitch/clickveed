import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { clearAllAppCaches, getCacheStatus } from '@/server/services/cache-service';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const status = await getCacheStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('[CacheAPI] Failed to get cache status:', error);
    return NextResponse.json({ error: 'Failed to get cache status' }, { status: 500 });
  }
}

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await clearAllAppCaches();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[CacheAPI] Failed to clear caches:', error);
    return NextResponse.json({ error: 'Failed to clear caches' }, { status: 500 });
  }
}
