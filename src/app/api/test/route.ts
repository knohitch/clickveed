import { NextResponse } from 'next/server';
import { runAllTests } from '@/lib/core-feature-tests';
import { logError } from '@/lib/error-handler';
import { requireProductionRouteFlag, requireSuperAdminApi } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/**
 * Test endpoint for validating application functionality
 */
export async function GET() {
  const blockedInProduction = await requireProductionRouteFlag({
    route: '/api/test',
    method: 'GET',
    envFlag: 'ENABLE_PROD_DEBUG_ROUTES',
    description: 'Internal test endpoint',
  });
  if (blockedInProduction) {
    return blockedInProduction;
  }

  const unauthorized = await requireSuperAdminApi({
    route: '/api/test',
    method: 'GET',
  });
  if (unauthorized) {
    return unauthorized;
  }

  try {
    // Run all core feature tests
    const testResults = await runAllTests();
    
    const response = {
      timestamp: new Date().toISOString(),
      status: testResults.status,
      tests: testResults.results
    };
    
    return NextResponse.json(response);
  } catch (error) {
    logError(error as Error, 'Test endpoint failed');
    return NextResponse.json(
      { 
        error: 'Test endpoint failed',
        message: (error as Error).message
      },
      { status: 500 }
    );
  }
}
