import { NextResponse } from 'next/server';
import { fixUsersWithMissingDisplayName } from '@/server/actions/user-actions';
import { requireProductionRouteFlag, requireSuperAdminApi } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST() {
  const blockedInProduction = await requireProductionRouteFlag({
    route: '/api/users/fix-display-names',
    method: 'POST',
    envFlag: 'ENABLE_PROD_REPAIR_ROUTES',
    description: 'User display-name repair endpoint',
  });
  if (blockedInProduction) {
    return blockedInProduction;
  }

  const unauthorized = await requireSuperAdminApi({
    route: '/api/users/fix-display-names',
    method: 'POST',
  });
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const result = await fixUsersWithMissingDisplayName();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fixing user display names:', error);
    return NextResponse.json({ error: 'Failed to fix user display names' }, { status: 500 });
  }
}
