

import { MagicClipsGenerator } from '@/components/magic-clips-generator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureGuard } from '@/components/feature-lock';
import { useAuth } from '@/contexts/auth-context';
import type { PlanFeature } from '@prisma/client';
import { LoadingSpinner } from '@/components/loading-spinner';

export default function MagicClipsPage() {
    return (
        <FeatureGuard featureId="magic-clips" planName={null} fallback={<MagicClipsLoading />}>
            <MagicClipsContent />
        </FeatureGuard>
    );
}

function MagicClipsContent() {
    const { subscriptionPlan, planFeatures, loading } = useAuth();

    if (loading) {
        return <MagicClipsLoading />;
    }

    return (
        <FeatureGuard featureId="magic-clips" planName={subscriptionPlan?.name || null} planFeatures={planFeatures}>
            <MagicClipsGenerator />
        </FeatureGuard>
    );
}

function MagicClipsLoading() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Magic Clips Generator</CardTitle>
                <CardDescription>
                    Upload a long-form video and let our AI find the most engaging, viral-worthy short clips for you.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-8">
                <LoadingSpinner />
            </CardContent>
        </Card>
    );
}
