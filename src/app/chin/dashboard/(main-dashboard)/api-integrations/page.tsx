
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Bot, ImageIcon, Video, MicVocal, Workflow, Banknote, Save, Facebook, Instagram, Youtube } from "lucide-react";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiCategoryCard, ApiKeyInput } from "@/components/admin/api-category-card";
import { useAdminSettings } from "@/contexts/admin-settings-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ApiKeys } from "@/contexts/admin-settings-context";

// A placeholder for a TikTok icon
const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-2.43.05-4.84-.95-6.6-2.73-1.75-1.78-2.55-4.16-2.4-6.6.14-2.44 1.11-4.75 2.87-6.36 1.75-1.62 4.06-2.43 6.42-2.29.02 1.52.02 3.04.01 4.56-.52-.01-1.04.04-1.56.04-1.29 0-2.54.49-3.47 1.44-.92.95-1.39 2.22-1.38 3.54.02 1.37.47 2.68 1.44 3.63.97.96 2.29 1.41 3.63 1.41.02 0 .02 0 .03 0 .86 0 1.69-.21 2.44-.6.81-.39 1.49-.96 1.99-1.66.44-.6.75-1.32.92-2.09.13-.6.18-1.22.2-1.84.02-3.33.01-6.67 0-10.01z" />
    </svg>
);
// A placeholder for a Snapchat icon
const SnapchatIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" fill="currentColor" {...props}>
        <path d="M46.6,35.1c-5.8-1-8.4-7.1-8.5-7.1c0,0,0-0.1-0.1-0.1c-0.3-0.6-0.3-0.9-0.2-1.2c0.2-0.6,1.6-1,2.2-1.2c0,0,0.1,0,0.1-0.1	c0,0,0.1,0,0.1,0c0.1,0,0.3-0.1,0.4-0.1c1.7-0.7,2.6-1.6,2.6-2.7c0-1-0.9-1.8-1.8-2c-0.2-0.1-0.4-0.1-0.5-0.1	c-0.2,0-0.4-0.1-0.6-0.1c-0.3,0-0.7,0-1.1,0.2C38.6,20.9,38,21,37.6,21c0-0.2,0-0.4,0-0.6l0,0l0-0.3c0.2-3.2,0.5-6.8-0.6-9	C33.9,4,27.3,3.5,25.4,3.5h-0.9c-2,0-8.6,0.5-11.6,7.5c-0.9,2.3-0.8,5.9-0.6,9.3c0,0.2,0,0.4,0,0.7c-0.1,0-0.2,0-0.3,0	c-0.5,0-1.2-0.2-1.8-0.5c-0.4-0.2-0.8-0.2-1-0.2c-1.2,0-2.5,0.7-2.7,2c0,0,0,0.1,0,0.1c0,1.2,0.9,2.2,2.6,2.8	c0.2,0.1,0.3,0.1,0.4,0.1c0,0,0.1,0,0.1,0c0,0,0.1,0,0.1,0.1c0.6,0.2,2,0.7,2.2,1.2c0,0,0,0.1,0,0.1c0.1,0.1,0.1,0.4-0.2,1	c0,0,0,0.1,0,0.1c0,0.1-2.6,6.2-8.5,7.1c-0.1,0-0.2,0-0.3,0.1c-0.4,0.2-1,0.7-1,1.4v0.2c0,0.2,0,0.3,0.1,0.4	c0.6,1.2,2.6,2.1,6.1,2.6c0,0.1,0.1,0.2,0.1,0.3c0.1,0.1,0.1,0.3,0.2,0.4c0,0.3,0.1,0.5,0.2,0.8l0.1,0.2c0.2,0.8,0.8,1.3,1.6,1.3	c0.2,0,0.6,0,1.1-0.1l0.4-0.1c0.5-0.1,1.2-0.2,1.9-0.2c0.5,0,1.1,0.1,1.6,0.2c1,0.2,1.9,0.7,3,1.5c0,0,0.1,0.1,0.1,0.1	c1.7,1.1,3.5,2.4,6.4,2.4h0.5c2.9,0,4.8-1.3,6.3-2.5l0.4-0.2c0.9-0.6,1.8-1.1,2.6-1.3c1.3-0.2,2.4-0.2,3.4,0c0.2,0,0.4,0.1,0.5,0.1	c0.5,0.1,0.9,0.1,1.1,0.1h0.1c0.8,0,1.3-0.4,1.5-1.1c0.1-0.2,0.1-0.4,0.1-0.7c0-0.1,0-0.2,0.1-0.3c0,0,0-0.1,0-0.1	c0.1-0.4,0.1-0.6,0.2-0.7c3.4-0.5,5.3-1.3,6-2.5c0.3-0.4,0.3-0.7,0.3-0.9C47.9,35.8,47.3,35.2,46.6,35.1z" />
    </svg>
);


export default function ApiIntegrationsPage() {
    const { loading, apiKeys, setApiKeys } = useAdminSettings();
    const [localApiKeys, setLocalApiKeys] = React.useState<ApiKeys>(apiKeys);
    const { toast } = useToast();

    React.useEffect(() => {
        setLocalApiKeys(apiKeys);
    }, [apiKeys]);
    
    const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalApiKeys(prev => ({...prev, [name]: value}));
    }

    const handleSaveAll = () => {
        setApiKeys(localApiKeys);
        toast({ title: "API Keys Saved", description: "All API keys have been updated successfully." });
    };


    if (loading) {
        return (
            <div className="space-y-8">
                <div>
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-4 w-2/3 mt-2" />
                </div>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="space-y-8">
                        <Skeleton className="h-96 w-full" />
                        <Skeleton className="h-80 w-full" />
                    </div>
                    <div className="space-y-8">
                        <Skeleton className="h-80 w-full" />
                        <Skeleton className="h-96 w-full" />
                    </div>
                 </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-3xl font-bold font-headline">API Integrations</h1>
                <p className="text-muted-foreground">
                    Manage API keys and connections for third-party services. Your keys are stored securely.
                </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-8">
                    <ApiCategoryCard title="Language Models" icon={Bot}>
                        <ApiKeyInput name="gemini" label="Google Gemini API Key" value={localApiKeys.gemini} onChange={handleKeyChange} />
                        <ApiKeyInput name="openai" label="OpenAI API Key" value={localApiKeys.openai} onChange={handleKeyChange} />
                    </ApiCategoryCard>
                    
                    <ApiCategoryCard title="Social Media Connections" icon={Facebook}>
                        <ApiKeyInput name="googleClientId" label="Google Client ID" value={localApiKeys.googleClientId} onChange={handleKeyChange}/>
                        <ApiKeyInput name="googleClientSecret" label="Google Client Secret" value={localApiKeys.googleClientSecret} onChange={handleKeyChange}/>
                        <ApiKeyInput name="facebookClientId" label="Facebook Client ID" value={localApiKeys.facebookClientId} onChange={handleKeyChange}/>
                        <ApiKeyInput name="facebookClientSecret" label="Facebook Client Secret" value={localApiKeys.facebookClientSecret} onChange={handleKeyChange}/>
                        <ApiKeyInput name="instagramClientId" label="Instagram Client ID" value={localApiKeys.instagramClientId} onChange={handleKeyChange}/>
                        <ApiKeyInput name="instagramClientSecret" label="Instagram Client Secret" value={localApiKeys.instagramClientSecret} onChange={handleKeyChange}/>
                        <ApiKeyInput name="tiktokClientKey" label="TikTok Client Key" value={localApiKeys.tiktokClientKey} onChange={handleKeyChange}/>
                        <ApiKeyInput name="tiktokClientSecret" label="TikTok Client Secret" value={localApiKeys.tiktokClientSecret} onChange={handleKeyChange}/>
                         <ApiKeyInput name="snapchatClientId" label="Snapchat Client ID" value={localApiKeys.snapchatClientId} onChange={handleKeyChange}/>
                        <ApiKeyInput name="snapchatClientSecret" label="Snapchat Client Secret" value={localApiKeys.snapchatClientSecret} onChange={handleKeyChange}/>
                    </ApiCategoryCard>

                     <ApiCategoryCard title="Video & Image Stock" icon={Video}>
                       <ApiKeyInput name="pexels" label="Pexels API Key" value={localApiKeys.pexels} onChange={handleKeyChange}/>
                       <ApiKeyInput name="pixabay" label="Pixabay API Key" value={localApiKeys.pixabay} onChange={handleKeyChange}/>
                       <ApiKeyInput name="unsplash" label="Unsplash Access Key" value={localApiKeys.unsplash} onChange={handleKeyChange}/>
                    </ApiCategoryCard>

                     <ApiCategoryCard title="Payment Gateways" icon={Banknote}>
                        <ApiKeyInput name="stripePublishableKey" label="Stripe Publishable Key" value={localApiKeys.stripePublishableKey} onChange={handleKeyChange}/>
                        <ApiKeyInput name="stripeSecretKey" label="Stripe Secret Key" value={localApiKeys.stripeSecretKey} onChange={handleKeyChange}/>
                        <ApiKeyInput name="stripeWebhookSecret" label="Stripe Webhook Secret" value={localApiKeys.stripeWebhookSecret} onChange={handleKeyChange}/>
                        <ApiKeyInput name="paypalClientId" label="PayPal Client ID" value={localApiKeys.paypalClientId} onChange={handleKeyChange}/>
                        <ApiKeyInput name="paypalClientSecret" label="PayPal Client Secret" value={localApiKeys.paypalClientSecret} onChange={handleKeyChange}/>
                        <ApiKeyInput name="paystackPublicKey" label="Paystack Public Key" value={localApiKeys.paystackPublicKey} onChange={handleKeyChange}/>
                        <ApiKeyInput name="paystackSecretKey" label="Paystack Secret Key" value={localApiKeys.paystackSecretKey} onChange={handleKeyChange}/>
                        <ApiKeyInput name="flutterwavePublicKey" label="Flutterwave Public Key" value={localApiKeys.flutterwavePublicKey} onChange={handleKeyChange}/>
                        <ApiKeyInput name="flutterwaveSecretKey" label="Flutterwave Secret Key" value={localApiKeys.flutterwaveSecretKey} onChange={handleKeyChange}/>
                    </ApiCategoryCard>

                </div>

                <div className="space-y-8">
                     <ApiCategoryCard title="Image, Video & Audio Generation" icon={ImageIcon}>
                        <ApiKeyInput name="elevenlabs" label="ElevenLabs API Key" value={localApiKeys.elevenlabs} onChange={handleKeyChange}/>
                        <ApiKeyInput name="replicate" label="Replicate API Key" value={localApiKeys.replicate} onChange={handleKeyChange}/>
                        <ApiKeyInput name="seedance" label="Seedance API Key" value={localApiKeys.seedance} onChange={handleKeyChange}/>
                        <ApiKeyInput name="wan" label="Wan API Key" value={localApiKeys.wan} onChange={handleKeyChange}/>
                    </ApiCategoryCard>

                     <ApiCategoryCard title="Platform & Workflow" icon={Workflow}>
                        <ApiKeyInput name="n8n" label="n8n API Key" value={localApiKeys.n8n} onChange={handleKeyChange}/>
                        <ApiKeyInput name="make" label="Make.com API Key" value={localApiKeys.make} onChange={handleKeyChange}/>
                    </ApiCategoryCard>
                </div>
            </div>

             <div className="flex justify-end sticky bottom-6">
                <Button size="lg" onClick={handleSaveAll}>
                    <Save className="mr-2 h-4 w-4" />
                    Save All Settings
                </Button>
            </div>
        </div>
    );
}
