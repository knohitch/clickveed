
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAdminSettings } from "@/contexts/admin-settings-context";
import { CheckCircle, AlertCircle, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

const IntegrationStatusCard = ({ platform, isConfigured }: { platform: string, isConfigured: boolean }) => (
    <div className="p-4 border rounded-lg">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="font-semibold text-lg mb-2">{platform}</h3>
                <p className="text-sm text-muted-foreground mb-4">Status of the {platform} integration managed by your administrator.</p>
            </div>
             <div className={cn(
                "flex items-center gap-2 text-sm font-semibold",
                isConfigured ? 'text-green-600' : 'text-yellow-600'
             )}>
                {isConfigured ? <CheckCircle className="h-4 w-4"/> : <AlertCircle className="h-4 w-4"/>}
                {isConfigured ? "Connected" : "Not Configured"}
            </div>
        </div>
        {!isConfigured && (
            <p className="text-xs text-muted-foreground">Please contact your administrator to configure the {platform} API key.</p>
        )}
    </div>
);


export default function AiAgentIntegrationsPage() {
    const { isN8nConfigured, isMakeConfigured } = useAdminSettings();
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> Platform Integrations</CardTitle>
                <CardDescription>Connect your n8n and Make.com accounts to deploy AI agents directly. Status is managed by the administrator.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <IntegrationStatusCard platform="n8n" isConfigured={isN8nConfigured} />
                <IntegrationStatusCard platform="Make.com" isConfigured={isMakeConfigured} />
            </CardContent>
        </Card>
    );
}
