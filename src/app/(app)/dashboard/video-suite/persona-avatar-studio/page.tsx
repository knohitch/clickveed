

import { PersonaAvatarStudio } from '@/components/persona-avatar-studio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureGuard } from '@/components/feature-lock';
import { useAuth } from '@/contexts/auth-context';
import { LoadingSpinner } from '@/components/loading-spinner';

export default function PersonaAvatarStudioPage() {
    return (
        <FeatureGuard featureId="persona-studio" planName={null} fallback={<PersonaAvatarStudioLoading />}>
            <PersonaAvatarStudioContent />
        </FeatureGuard>
    );
}

function PersonaAvatarStudioContent() {
    const { subscriptionPlan, loading } = useAuth();

    if (loading) {
        return <PersonaAvatarStudioLoading />;
    }

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

function PersonaAvatarStudioLoading() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Persona & Avatar Studio</CardTitle>
                <CardDescription>
                    Define the personality and generate the visual appearance of your AI influencer.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-8">
                <LoadingSpinner />
            </CardContent>
        </Card>
    );
}
