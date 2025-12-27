
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAdminSettings } from "@/contexts/admin-settings-context";
import { Power } from "lucide-react";

export function SupportStatusSwitch() {
    const { isSupportOnline, setIsSupportOnline, loading: settingsLoading } = useAdminSettings();
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Support Status</CardTitle>
                <CardDescription>Set the availability of the support team.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <Label htmlFor="support-status-switch" className="text-base font-medium flex items-center gap-2">
                            <Power className={`h-4 w-4 transition-colors ${isSupportOnline ? 'text-green-500' : 'text-red-500'}`} />
                            Team is currently {isSupportOnline ? "Online" : "Away"}
                        </Label>
                        <CardDescription className="text-sm mt-1">
                            Toggling this will affect the user-facing support widget.
                        </CardDescription>
                    </div>
                    <Switch
                        id="support-status-switch"
                        checked={isSupportOnline}
                        onCheckedChange={setIsSupportOnline}
                        disabled={settingsLoading}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
