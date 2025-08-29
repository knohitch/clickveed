

import { MagicClipsGenerator } from '@/components/magic-clips-generator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureLock } from '@/components/feature-lock';

export default function MagicClipsPage() {
    return (
        <FeatureLock requiredPlan='Pro' featureName='Magic Clips Generator'>
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
        </FeatureLock>
    );
}
