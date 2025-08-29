

import { PersonaAvatarStudio } from '@/components/persona-avatar-studio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureLock } from '@/components/feature-lock';

export default function PersonaAvatarStudioPage() {
    return (
        <FeatureLock requiredPlan='Enterprise' featureName='Persona & Avatar Studio'>
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
        </FeatureLock>
    );
}
