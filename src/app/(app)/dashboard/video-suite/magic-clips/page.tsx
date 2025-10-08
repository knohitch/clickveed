

import { MagicClipsGenerator } from '@/components/magic-clips-generator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureGuard } from '@/components/feature-lock';
import { useAuth } from '@/contexts/auth-context';

export default function MagicClipsPage() {
    const { subscriptionPlan } = useAuth();

    return (
        <FeatureGuard featureId="magic-clips" planName={subscriptionPlan?.name || null}>
            <Card>
                <CardHeader>
                    <CardTitle>Magic Clips Generator</CardTitle>
                    <CardDescription>
                        Upload a long-form video and let our AI find the most engaging, viral-worthy short clips for you.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <MagicClipsGenerator />
                </CardContent>
            </Card>
        </FeatureGuard>
    );
}
