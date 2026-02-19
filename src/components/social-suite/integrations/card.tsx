
'use client';

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Power, PowerOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { deleteConnection } from "@/server/actions/social-actions";
import { useAdminSettings } from "@/contexts/admin-settings-context";

export type PlatformId = 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'whatsapp' | 'snapchat' | 'threads' | 'linkedin' | 'x';

interface SocialConnectionCardProps {
    platform: { id: PlatformId; name: string; icon: React.ElementType };
    isConnected: boolean;
    onConnectionChange: () => void;
}

export function SocialConnectionCard({ platform, isConnected, onConnectionChange }: SocialConnectionCardProps) {
    const { toast } = useToast();
    const [isDisconnecting, startDisconnectTransition] = useTransition();
    const { apiKeys } = useAdminSettings();
    
    // Dynamically get the client ID from the admin settings context
    const getClientId = () => {
        switch(platform.id) {
            case 'youtube': return apiKeys.googleClientId;
            case 'facebook': return apiKeys.facebookClientId;
            case 'instagram': return apiKeys.instagramClientId;
            case 'tiktok': return apiKeys.tiktokClientKey;
            case 'snapchat': return apiKeys.snapchatClientId;
            case 'whatsapp': return apiKeys.whatsappClientId;
            case 'threads': return apiKeys.threadsClientId;
            case 'linkedin': return apiKeys.linkedinClientId;
            case 'x': return apiKeys.xClientId;
            default: return null;
        }
    }
    
    const getOAuthUrl = (): string => {
        const clientId = getClientId();
        const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/api/connect/${platform.id}` : '';
        if (!redirectUri || !clientId) return '#';

        switch (platform.id) {
            case 'facebook':
                return `https://www.facebook.com/v20.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=pages_show_list,pages_read_engagement,pages_manage_posts,public_profile,email`;
            case 'instagram':
                 return `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user_profile,user_media&response_type=code`;
            case 'youtube':
                return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly&response_type=code&access_type=offline&prompt=consent`;
            case 'tiktok':
                 return `https://www.tiktok.com/v2/auth/authorize?client_key=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user.info.basic,video.publish&response_type=code`;
            case 'whatsapp':
                return `https://facebook.com/v20.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=whatsapp_business_management,whatsapp_business_messaging`;
            case 'threads':
                return `https://www.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=threads_basic,threads_content_publish&response_type=code`;
            case 'linkedin':
                return `https://www.linkedin.com/oauth/v2/authorization?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=r_liteprofile%20r_emailaddress%20w_member_social&response_type=code`;
            case 'x':
                return `https://twitter.com/i/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.read%20tweet.write%20users.read%20offline.access&response_type=code&code_challenge=challenge&code_challenge_method=plain`;
            default:
                return '#'; // Fallback for platforms not fully configured
        }
    }
    
    const handleDisconnect = () => {
        startDisconnectTransition(async () => {
            try {
                await deleteConnection(platform.id);
                toast({ title: "Disconnected", description: `Successfully disconnected from ${platform.name}.` });
                onConnectionChange(); // Notify parent to re-fetch connections
            } catch (error) {
                 toast({ variant: 'destructive', title: "Error", description: `Failed to disconnect from ${platform.name}.` });
            }
        });
    }

    const isConnectable = !!getClientId();

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <platform.icon className="h-6 w-6" />
                    <CardTitle className="text-xl">{platform.name}</CardTitle>
                </div>
                {isConnected && <div className="flex items-center gap-2 text-sm text-green-600"><CheckCircle className="h-4 w-4"/>Connected</div>}
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground h-10">
                 {isConnected ? `Your ${platform.name} account is connected.` : `Connect your ${platform.name} account to enable direct posting and analytics.`}
                </p>
            </CardContent>
            <CardFooter>
                 {isConnected ? (
                     <Button variant="destructive" className="w-full" onClick={handleDisconnect} disabled={isDisconnecting}>
                        {isDisconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PowerOff className="mr-2 h-4 w-4" />}
                        Disconnect {platform.name}
                    </Button>
                 ) : (
                    <Button asChild className="w-full" disabled={!isConnectable}>
                        <Link href={isConnectable ? getOAuthUrl() : '#'}>
                             <Power className="mr-2 h-4 w-4"/> Connect {platform.name}
                        </Link>
                    </Button>
                 )}
            </CardFooter>
        </Card>
    )
}
