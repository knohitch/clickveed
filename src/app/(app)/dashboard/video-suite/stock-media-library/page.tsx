
import { StockMediaGenerator } from '@/components/stock-media-generator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function StockMediaLibraryPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Stock Media Generator</CardTitle>
                <CardDescription>
                    Generate unique, royalty-free images for your projects with a simple text prompt.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <StockMediaGenerator />
            </CardContent>
        </Card>
    );
}
