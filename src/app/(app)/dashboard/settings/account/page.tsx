
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { requestPasswordResetAction } from "@/server/actions/auth-actions";
import { useAuth } from "@/contexts/auth-context";

export default function AccountSettingsPage() {
    const { toast } = useToast();
    const { currentUser } = useAuth();
    const [resetState, setResetState] = useState({ message: '', error: ''});

    const handlePasswordChangeRequest = async () => {
        if (!currentUser?.email) return;

        const formData = new FormData();
        formData.append('email', currentUser.email);

        const result = await requestPasswordResetAction(null, formData);

        if (result.success) {
            setResetState({ message: 'A password reset link has been sent to your email.', error: '' });
        } else {
             setResetState({ message: '', error: result.error || 'An unknown error occurred.' });
        }
    };

    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>Security</CardTitle>
                    <CardDescription>Manage your account security settings.</CardDescription>
                </CardHeader>
                 <CardContent>
                    {resetState.message && (
                        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/50 text-green-700 rounded-md text-sm">
                            {resetState.message}
                        </div>
                    )}
                    {resetState.error && (
                         <div className="mb-4 p-4 bg-destructive/10 border border-destructive/50 text-destructive rounded-md text-sm">
                            {resetState.error}
                        </div>
                    )}
                    <Button type="button" onClick={handlePasswordChangeRequest}>Send Password Reset Email</Button>
                </CardContent>
            </Card>
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Delete Account</CardTitle>
                    <CardDescription>Permanently delete your account and all associated data. This action cannot be undone.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">Delete My Account</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete your account and remove all your data.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => toast({ title: "Account Deletion (Simulated)", description: "Your account would be deleted now." })}
                                    className="bg-destructive hover:bg-destructive/90"
                                >
                                    Yes, Delete My Account
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}
