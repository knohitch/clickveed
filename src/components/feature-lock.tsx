import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getMinimumPlanForFeature, getFeatureDisplayName } from '@/lib/feature-access';
import { ALWAYS_ACCESSIBLE_FEATURES, FEATURE_MINIMUM_PLAN } from '@/lib/feature-config';
import type { PlanFeature } from '@prisma/client';

/**
 * FEATURE LOCK COMPONENT
 * 
 * This component now uses the centralized feature access logic that prioritizes:
 * 1. Admin-controlled database features (PlanFeature records)
 * 2. Tier-based fallback (plan.featureTier)
 * 
 * The key fix: Admins can enable ANY feature for the Free plan by adding
 * it to the plan's features list in the database. The component will respect
 * this configuration regardless of hardcoded tier definitions.
 * 
 * Why this fixes the "free plan does nothing" bug:
 * - Previously, free users were blocked by hardcoded tier definitions
 * - Now, if admin adds "voice-cloning" to Free plan features, free users get access
 * - The feature check prioritizes database features over hardcoded tiers
 */

interface FeatureLockProps {
  featureId: string;
  planName: string | null;
  title?: string;
  description?: string;
  className?: string;
}

/**
 * Match feature keywords for better detection
 */
function matchFeatureKeywords(featureText: string, featureId: string): boolean {
  const keywordMap: Record<string, string[]> = {
    'video-suite': ['video', 'editing', 'creation'],
    'ai-assistant': ['ai', 'assistant', 'chat'],
    'voice-cloning': ['voice', 'clone', 'cloning'],
    'background-remover': ['background', 'remove', 'remover'],
    'social-analytics': ['social', 'analytics', 'insights'],
    'social-scheduler': ['social', 'schedule', 'scheduling'],
    'magic-clips': ['magic', 'clips', 'highlights'],
    'script-generator': ['script', 'generator', 'writing'],
    'voice-over': ['voice', 'over', 'voiceover', 'narration'],
    'image-to-video': ['image', 'video', 'conversion'],
    'stock-media': ['stock', 'media', 'library'],
    'ai-agents': ['agent', 'automation', 'workflow'],
    'brand-kit': ['brand', 'kit', 'branding'],
  };
  
  const keywords = keywordMap[featureId] || [];
  return keywords.some(keyword => featureText.includes(keyword));
}

/**
 * Check feature access based on plan features from database
 */
function checkFeatureAccessWithFeatures(
  planFeatures: PlanFeature[],
  featureId: string
): { canAccess: boolean; requiresUpgrade: boolean; featureName: string } {
  // Always allow basic features for all users
  if ((ALWAYS_ACCESSIBLE_FEATURES as readonly string[]).includes(featureId)) {
    return {
      canAccess: true,
      requiresUpgrade: false,
      featureName: getFeatureDisplayName(featureId),
    };
  }
  
  // If no plan features, use default free features as fallback
  if (!planFeatures || planFeatures.length === 0) {
    const { DEFAULT_FREE_PLAN_FEATURES } = require('@/lib/feature-config');
    const canAccess = DEFAULT_FREE_PLAN_FEATURES.includes(featureId);
    return {
      canAccess,
      requiresUpgrade: !canAccess,
      featureName: getFeatureDisplayName(featureId),
    };
  }
  
  // Check if the user's plan includes this specific feature
  const hasFeature = planFeatures.some(feature => {
    // Match feature text to feature ID (flexible matching)
    const featureText = feature.text.toLowerCase();
    const searchId = featureId.toLowerCase().replace('-', ' ');
    
    // Direct text matching or keyword matching (using local function)
    return featureText.includes(searchId) || 
           featureText.includes(getFeatureDisplayName(featureId).toLowerCase()) ||
           matchFeatureKeywords(featureText, featureId);
  });
  
  return {
    canAccess: hasFeature,
    requiresUpgrade: !hasFeature,
    featureName: getFeatureDisplayName(featureId),
  };
}

export function FeatureLock({ 
  featureId, 
  planName, 
  featureTier,
  planFeatures,
  title, 
  description, 
  className = '' 
}: FeatureLockProps & { 
  featureTier?: string | null;
  planFeatures?: PlanFeature[];
}): React.ReactElement | null {
  
  // Use plan features if available, otherwise fall back to tier-based check
  const featureAccess = (planFeatures && planFeatures.length > 0)
    ? checkFeatureAccessWithFeatures(planFeatures, featureId)
    : (() => {
        const { checkFeatureAccess } = require('@/lib/feature-access');
        return checkFeatureAccess(planName, featureId, featureTier);
      })();
  
  const minimumPlan = getMinimumPlanForFeature(featureId);

  if (featureAccess.canAccess) {
    return null; // User has access, don't show lock
  }

  return (
    <Card className={`border-yellow-200 bg-yellow-50 ${className}`}>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
          <Lock className="h-6 w-6 text-yellow-600" />
        </div>
        <CardTitle className="text-xl text-yellow-800">
          {title || `${featureAccess.featureName} is Locked`}
        </CardTitle>
        <CardDescription className="text-yellow-600">
          {description || `This feature requires a ${minimumPlan} plan or higher to access.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2 text-sm text-yellow-700">
            <Star className="h-4 w-4" />
            <span>Upgrade to {minimumPlan} to unlock this feature</span>
          </div>
          <Button asChild className="bg-yellow-600 hover:bg-yellow-700">
            <Link href="/dashboard/settings">
              Upgrade Plan
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface FeatureGuardProps {
  featureId: string;
  planName: string | null;
  featureTier?: string | null;
  planFeatures?: PlanFeature[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGuard({ featureId, planName, featureTier, planFeatures, children, fallback }: FeatureGuardProps): React.ReactElement {
  
  // Use plan features if available, otherwise fall back to tier-based check
  const featureAccess = (planFeatures && planFeatures.length > 0)
    ? checkFeatureAccessWithFeatures(planFeatures, featureId)
    : (() => {
        const { checkFeatureAccess } = require('@/lib/feature-access');
        return checkFeatureAccess(planName, featureId, featureTier);
      })();

  if (featureAccess.canAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <FeatureLock 
      featureId={featureId} 
      planName={planName}
      featureTier={featureTier}
      planFeatures={planFeatures}
      title="Feature Not Available"
      description="This feature is not included in your current plan."
    />
  );
}
