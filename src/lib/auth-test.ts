'use server';

import { auth } from '@/auth';
import { NextRequest } from 'next/server';

/**
 * Test function to verify authentication flow
 */
export async function testAuthFlow(request: NextRequest): Promise<boolean> {
  try {
    const session = await auth();
    
    // Check if user is authenticated
    if (!session?.user?.id) {
      return false;
    }
    
    // Additional checks for user role and status
    if (session.user.role === 'USER' && session.user.onboardingComplete === false) {
      // User needs to complete onboarding
      return true;
    }
    
    // Valid authenticated user
    return true;
  } catch (error) {
    console.error('Authentication test failed:', error);
    return false;
  }
}
