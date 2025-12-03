
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Bell, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

export default function SupportSettingsPage() {
    const { currentUser } = useAuth();
    const { toast } = useToast();

    const handleSaveChanges = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        toast({
            title: "Settings Saved",
            description: "Your settings have been updated.",
        });
    };
    
    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-3xl font-bold font-headline">Agent Settings</h1>
                <p className="text-muted-foreground">
                    Manage your profile and notification preferences.
                </p>
            </div>

            <form onSubmit={handleSaveChanges}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Profile</CardTitle>
                                <CardDescription>Update your personal information.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Full Name</Label>
                                    <Input id="fullName" defaultValue={currentUser?.displayName || ""} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input id="email" type="email" defaultValue={currentUser?.email || ""} disabled />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-8">
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</CardTitle>
                                <CardDescription>Choose how you receive notifications.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div>
                                        <Label htmlFor="email-notifications" className="font-medium">Email Notifications</Label>
                                        <p className="text-sm text-muted-foreground">Receive an email when a new ticket is assigned to you.</p>
                                    </div>
                                    <Switch id="email-notifications" defaultChecked />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div>
                                        <Label htmlFor="desktop-notifications" className="font-medium">Desktop Notifications</Label>
                                         <p className="text-sm text-muted-foreground">Show a browser notification for new replies.</p>
                                    </div>
                                    <Switch id="desktop-notifications" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                 <div className="mt-8 flex justify-end">
                    <Button type="submit">Save Changes</Button>
                </div>
            </form>
        </div>
    );
}
