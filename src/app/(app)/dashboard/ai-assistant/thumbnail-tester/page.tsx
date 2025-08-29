
import { ThumbnailTester } from '@/components/thumbnail-tester';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ThumbnailTesterPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Thumbnail Tester</CardTitle>
                <CardDescription>
                    A/B test your thumbnails with AI-powered feedback, engagement scores, and actionable suggestions.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ThumbnailTester />
            </CardContent>
        </Card>
    );
}
