
import { TopicResearcher } from '../../../../../components/topic-researcher';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../../components/ui/card';

export default function TopicResearcherPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Topic & Keyword Researcher</CardTitle>
                <CardDescription>
                    Enter a broad topic to discover specific video ideas, keywords, and engagement potential.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <TopicResearcher />
            </CardContent>
        </Card>
    );
}
