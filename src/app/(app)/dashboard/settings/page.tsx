

'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export default function ProfilePage() {
    const { currentUser, updateUserDisplayName } = useAuth();
    const { toast } = useToast();
    
    const [fullName, setFullName] = useState(currentUser?.name || '');
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        setFullName(currentUser?.name || '');
    }, [currentUser]);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (fullName === currentUser?.name) return;
        setIsSaving(true);
        try {
            await updateUserDisplayName(fullName);
            toast({ title: "Profile Updated", description: "Your name has been successfully updated." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <form onSubmit={handleProfileUpdate}>
            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>Update your personal information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input 
                                id="fullName" 
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" type="email" defaultValue={currentUser?.email || "user@example.com"} disabled />
                        </div>
                    </div>
                </CardContent>
                 <CardFooter>
                    <Button type="submit" disabled={isSaving || fullName === currentUser?.name}>
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}

