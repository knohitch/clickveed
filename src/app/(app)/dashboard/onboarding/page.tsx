
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminSettings } from "@/contexts/admin-settings-context";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { upsertUser } from "@/server/actions/user-actions";
import { useSession } from "next-auth/react";

export default function OnboardingPage() {
    const { data: session, update } = useSession();
    const { appName } = useAdminSettings();
    const router = useRouter();
    const { toast } = useToast();
    const [referralSource, setReferralSource] = useState("");
    const [loading, setLoading] = useState(false);

    const handleOnboardingSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!session?.user?.id) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to complete onboarding.' });
            return;
        }

        setLoading(true);
        const formData = new FormData(event.currentTarget);
        
        try {
            await upsertUser({
                id: session.user.id,
                email: session.user.email!,
                onboardingData: {
                    workspaceName: formData.get('workspaceName') as string,
                    useCase: formData.get('useCase') as string,
                    businessNiche: formData.get('businessNiche') as string,
                    referralSource: formData.get('referralSource') as string,
                    socialMediaPlatform: formData.get('socialMediaPlatform') as string | undefined,
                    otherSource: formData.get('otherSource') as string | undefined,
                }
            });

            toast({ title: "Setup Complete!", description: "Welcome to your new workspace." });
            // Force a session refresh to update the onboarding status on the server
            await update({ onboardingComplete: true });
            router.push('/dashboard');

        } catch (error) {
            console.error("Onboarding error:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save your onboarding information. Please try again.' });
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-[22px] font-bold">Welcome to {appName}, {session?.user?.name || 'there'}!</CardTitle>
                    <CardDescription className="text-[18px]">
                        Just a few more details to get your workspace set up.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleOnboardingSubmit}>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="workspaceName">Workspace Name</Label>
                            <Input id="workspaceName" name="workspaceName" placeholder="e.g., My Awesome Brand" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="useCase">How do you plan to use this app?</Label>
                             <Select name="useCase" required>
                                <SelectTrigger id="useCase">
                                    <SelectValue placeholder="Select an option" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="business">For Business</SelectItem>
                                    <SelectItem value="personal">For Personal Projects</SelectItem>
                                    <SelectItem value="education">For Education</SelectItem>
                                    <SelectItem value="social-media">For Social Media Content</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="businessNiche">Your Business Niche</Label>
                            <Input id="businessNiche" name="businessNiche" placeholder="e.g., E-commerce, Marketing, Coaching" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="referralSource">How did you hear about us?</Label>
                             <Select name="referralSource" required onValueChange={setReferralSource}>
                                <SelectTrigger id="referralSource">
                                    <SelectValue placeholder="Select an option" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="social-media">Social Media</SelectItem>
                                    <SelectItem value="friend-referral">From a Friend</SelectItem>
                                    <SelectItem value="search-engine">Search Engine (Google, etc.)</SelectItem>
                                    <SelectItem value="advertisement">Advertisement</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {referralSource === 'social-media' && (
                            <div className="space-y-2 animate-accordion-down">
                                <Label htmlFor="socialMediaPlatform">Which platform?</Label>
                                <Select name="socialMediaPlatform">
                                    <SelectTrigger id="socialMediaPlatform">
                                        <SelectValue placeholder="Select a platform" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="facebook">Facebook</SelectItem>
                                        <SelectItem value="instagram">Instagram</SelectItem>
                                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                                        <SelectItem value="tiktok">TikTok</SelectItem>
                                        <SelectItem value="x-twitter">X (formerly Twitter)</SelectItem>
                                        <SelectItem value="youtube">YouTube</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {referralSource === 'other' && (
                            <div className="space-y-2 animate-accordion-down">
                                <Label htmlFor="otherSource">Please specify</Label>
                                <Input id="otherSource" name="otherSource" placeholder="e.g., Conference, Blog Post" />
                            </div>
                        )}
                        
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Saving...' : 'Complete Onboarding & Go to Dashboard'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
