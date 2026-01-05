

import { VoiceCloningStudio } from '@/components/voice-cloning-studio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureGuard } from '@/components/feature-lock';
import { useAuth } from '@/contexts/auth-context';
import type { PlanFeature } from '@prisma/client';
import { LoadingSpinner } from '@/components/loading-spinner';

export default function VoiceClippingPage() {
    return (
        <FeatureGuard featureId="voice-cloning" planName={null} fallback={<VoiceClippingLoading />}>
            <VoiceClippingContent />
        </FeatureGuard>
    );
}

function VoiceClippingContent() {
    const { subscriptionPlan, planFeatures, loading } = useAuth();

    if (loading) {
        return <VoiceClippingLoading />;
    }

    return (
        <FeatureGuard featureId="voice-cloning" planName={subscriptionPlan?.name || null} planFeatures={planFeatures}>
            <Card>
                <CardHeader>
                    <CardTitle>AI Voice Cloning</CardTitle>
                    <CardDescription>
                        Create a digital clone of your voice by providing a few audio samples.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <VoiceCloningStudio />
                </CardContent>
            </Card>
        </FeatureGuard>
    );
}

function VoiceClippingLoading() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Voice Cloning</CardTitle>
                <CardDescription>
                    Create a digital clone of your voice by providing a few audio samples.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-8">
                <LoadingSpinner />
            </CardContent>
        </Card>
    );
}
