import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { auth } from '@/auth';
import { requireProductionRouteFlag, requireSuperAdminApi } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET() {
  const blockedInProduction = await requireProductionRouteFlag({
    route: '/api/debug-users',
    method: 'GET',
    envFlag: 'ENABLE_PROD_DEBUG_ROUTES',
    description: 'Debug users endpoint',
  });
  if (blockedInProduction) {
    return blockedInProduction;
  }

  const unauthorized = await requireSuperAdminApi({
    route: '/api/debug-users',
    method: 'GET',
  });
  if (unauthorized) {
    return unauthorized;
  }

  try {
    // Check current user session
    const session = await auth();
    
    // Get all users with their display names (sanitized for debug purposes)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: false, // Don't expose emails in debug endpoint
        displayName: true,
        role: true,
        status: true,
      }
    });
    
    return NextResponse.json({
      session: session?.user || null,
      users: users.map(user => ({
        ...user,
        hasDisplayName: !!user.displayName,
        displayNameLength: user.displayName ? user.displayName.length : 0
      }))
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Failed to fetch debug data' }, { status: 500 });
  }
}
