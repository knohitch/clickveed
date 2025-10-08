

import { PersonaAvatarStudio } from '@/components/persona-avatar-studio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureGuard } from '@/components/feature-lock';
import { useAuth } from '@/contexts/auth-context';

export default function PersonaAvatarStudioPage() {
    const { subscriptionPlan } = useAuth();

    return (
        <FeatureGuard featureId="persona-studio" planName={subscriptionPlan?.name || null}>
            <Card>
                <CardHeader>
                    <CardTitle>AI Persona & Avatar Studio</CardTitle>
                    <CardDescription>
                        Define the personality and generate the visual appearance of your AI influencer.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PersonaAvatarStudio />
                </CardContent>
            </Card>
        </FeatureGuard>
    );
}
