import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkFeatureAccess, getUserPlanFeatures } from '@/lib/features/check-access';

/**
 * POST /api/features/check
 * Check if the current user has access to a specific feature
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { featureId } = body;
    
    if (!featureId) {
      return NextResponse.json({ error: 'featureId is required' }, { status: 400 });
    }
    
    const access = await checkFeatureAccess(session.user.id, featureId);
    
    return NextResponse.json({
      featureId,
      hasAccess: access.canAccess,
      requiresUpgrade: access.requiresUpgrade,
      featureName: access.featureName,
      planName: access.planName,
    });
  } catch (error) {
    console.error('[Feature Check API] Error:', error);
    return NextResponse.json({ error: 'Failed to check feature' }, { status: 500 });
  }
}

/**
 * GET /api/features/check
 * Get all features available to the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const features = await getUserPlanFeatures(session.user.id);
    
    return NextResponse.json({ 
      features,
      count: features.length,
    });
  } catch (error) {
    console.error('[Feature List API] Error:', error);
    return NextResponse.json({ error: 'Failed to get features' }, { status: 500 });
  }
}
