import { NextResponse } from 'next/server';
import { runAllTests } from '@/lib/core-feature-tests';
import { logError } from '@/lib/error-handler';

/**
 * Test endpoint for validating application functionality
 */
export async function GET() {
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
