
import { VideoFromUrlGenerator } from '@/components/video-from-url-generator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VideoFromUrlPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Create Video from URL</CardTitle>
                <CardDescription>
                    Paste a link to an article or website, and our AI will generate a summary video script.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <VideoFromUrlGenerator />
            </CardContent>
        </Card>
    );
}
