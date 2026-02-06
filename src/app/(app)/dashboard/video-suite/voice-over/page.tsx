
import { VoiceOverGenerator } from '@/components/voice-over-generator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VoiceOverPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Voice Over Generator</CardTitle>
                <CardDescription>
                    Generate realistic voice overs from your text scripts in multiple languages and voices.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <VoiceOverGenerator />
            </CardContent>
        </Card>
    );
}
