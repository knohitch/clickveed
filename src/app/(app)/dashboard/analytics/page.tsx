
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "lucide-react";

export default function AnalyticsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">Social Media Analytics</h1>
                <p className="text-muted-foreground">
                    Track the performance of your content across all connected platforms.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Performance Overview</CardTitle>
                    <CardDescription>This is where analytics from your connected social media accounts will be displayed.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-md">
                        <BarChart className="h-12 w-12 mx-auto mb-4" />
                        <p>No analytics data available yet. Connect your social media accounts in settings to get started.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
