import { PersonaAvatarStudio } from '@/components/persona-avatar-studio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureLock } from '@/components/feature-lock';
import { getFeaturePageAccess } from '@/lib/server-feature-page';

export default async function PersonaAvatarStudioPage() {
    const access = await getFeaturePageAccess('persona-studio');

    if (!access.canAccess) {
        return (
            <FeatureLock
                featureId="persona-studio"
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
                <CardTitle>AI Persona & Avatar Studio</CardTitle>
                <CardDescription>
                    Define personality and generate visual appearance of your AI influencer.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <PersonaAvatarStudio />
            </CardContent>
        </Card>
    );
}
