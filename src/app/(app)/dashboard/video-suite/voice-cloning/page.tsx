import { VoiceCloningStudio } from '@/components/voice-cloning-studio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureLock } from '@/components/feature-lock';
import { getFeaturePageAccess } from '@/lib/server-feature-page';

export default async function VoiceClippingPage() {
    const access = await getFeaturePageAccess('voice-cloning');

    if (!access.canAccess) {
        return (
            <FeatureLock
                featureId="voice-cloning"
                planName={access.planName}
                featureTier={access.featureTier}
                planFeatures={access.planFeatures}
                title="Feature Not Available"
                description="This feature is not included in your current plan."
            />
        );
    }

    return (
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
    );
}
