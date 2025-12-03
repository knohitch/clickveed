import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { checkFeatureAccess, getMinimumPlanForFeature } from '@/lib/feature-access';

interface FeatureLockProps {
  featureId: string;
  planName: string | null;
  title?: string;
  description?: string;
  className?: string;
}

export function FeatureLock({ 
  featureId, 
  planName, 
  title, 
  description, 
  className = '' 
}: FeatureLockProps) {
  const featureAccess = checkFeatureAccess(planName, featureId);
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
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGuard({ featureId, planName, children, fallback }: FeatureGuardProps) {
  const featureAccess = checkFeatureAccess(planName, featureId);

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
      title="Feature Not Available"
      description="This feature is not included in your current plan."
    />
  );
}
