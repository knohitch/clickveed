

import { VoiceCloningStudio } from '@/components/voice-cloning-studio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureLock } from '@/components/feature-lock';

export default function VoiceCloningPage() {
    return (
        <FeatureLock requiredPlan='Pro' featureName='AI Voice Cloning'>
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
        </FeatureLock>
    );
}
