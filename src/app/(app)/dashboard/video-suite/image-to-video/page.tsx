
import { ImageToVideoGenerator } from '@/components/image-to-video-generator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ImageToVideoPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Image to Video Creator</CardTitle>
                <CardDescription>
                    Transform a single image into a dynamic video with custom music and descriptive effects.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ImageToVideoGenerator />
            </CardContent>
        </Card>
    );
}
