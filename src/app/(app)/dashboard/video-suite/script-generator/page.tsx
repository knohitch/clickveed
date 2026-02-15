
import { ScriptGenerator } from '@/components/script-generator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ScriptGeneratorPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Script Generator</CardTitle>
                <CardDescription>
                    Provide a topic or a brief idea, and our AI will generate a complete video script for you.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScriptGenerator />
            </CardContent>
        </Card>
    );
}
