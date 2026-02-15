'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function VerifyPendingPage() {
    const { data: session } = useSession();
    const { toast } = useToast();
    const [isResending, setIsResending] = useState(false);

    const handleResendVerification = async () => {
        setIsResending(true);
        try {
            const response = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: session?.user?.email }),
            });

            const data = await response.json();

            if (response.ok) {
                toast({
                    title: "Verification Email Sent",
                    description: "Please check your inbox for the verification link.",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: data.error || "Failed to resend verification email.",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "An unexpected error occurred. Please try again.",
            });
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                        <Mail className="h-8 w-8 text-yellow-600" />
                    </div>
                    <CardTitle className="text-2xl">Verify Your Email</CardTitle>
                    <CardDescription>
                        Your account is pending verification. Please check your email for the verification link.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg bg-muted p-4 text-sm">
                        <p className="font-medium">Email sent to:</p>
                        <p className="text-muted-foreground">{session?.user?.email || 'your email address'}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        <p>Didn't receive the email? Check your spam folder or request a new verification link below.</p>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <Button
                        onClick={handleResendVerification}
                        disabled={isResending}
                        className="w-full"
                    >
                        {isResending ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Resend Verification Email
                            </>
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="w-full"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
