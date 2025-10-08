

import { VoiceCloningStudio } from '@/components/voice-cloning-studio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureGuard } from '@/components/feature-lock';
import { useAuth } from '@/contexts/auth-context';

export default function VoiceCloningPage() {
    const { subscriptionPlan } = useAuth();

    return (
        <FeatureGuard featureId="voice-cloning" planName={subscriptionPlan?.name || null}>
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
