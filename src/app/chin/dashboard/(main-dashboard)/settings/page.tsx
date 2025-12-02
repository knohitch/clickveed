
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAdminSettings } from "@/contexts/admin-settings-context";
import { ShieldCheck, Palette, UploadCloud, Trash2, User, Mail, Banknote, Save, Image as ImageIcon, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import type { ApiKeys, EmailSettings } from "@/contexts/admin-settings-context";
import { sendTestEmail } from "@/server/actions/admin-actions";

export default function AdminSettingsPage() {
    const { 
        allowAdminSignup, setAllowAdminSignup,
        appName, setAppName,
        logoUrl, setLogoUrl,
        faviconUrl, setFaviconUrl,
        emailSettings, setEmailSettings,
        apiKeys, setApiKeys
    } = useAdminSettings();

    const { toast } = useToast();
    const logoInputRef = useRef<HTMLInputElement>(null);
    const faviconInputRef = useRef<HTMLInputElement>(null);
    const [testEmail, setTestEmail] = useState('');
    const [testingEmail, setTestingEmail] = useState(false);

    const [localSettings, setLocalSettings] = useState({
        appName: appName,
        emailSettings: emailSettings,
        apiKeys: apiKeys
    });

    useEffect(() => {
        setLocalSettings({
            appName: appName,
            emailSettings: emailSettings,
            apiKeys: apiKeys
        });
    }, [appName, emailSettings, apiKeys]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({...prev, [name]: value}));
    };
    
    const handleNestedChange = (category: 'emailSettings' | 'apiKeys', e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [name]: value
            }
        }));
    };
    
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                setLogoUrl(dataUrl);
            }
            reader.readAsDataURL(file);
        }
    };

    const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                setFaviconUrl(dataUrl);
            }
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setLogoUrl(null);
    };
    
    const handleRemoveFavicon = () => {
        setFaviconUrl(null);
    };

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            setAppName(localSettings.appName);
            setEmailSettings(localSettings.emailSettings);
            setApiKeys(localSettings.apiKeys);

            toast({ title: "Settings Saved", description: "All settings have been updated successfully." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error Saving Settings", description: error.message });
        }
    };

    const handleTestEmail = async () => {
        if (!testEmail) {
            toast({ variant: 'destructive', title: "Email Required", description: "Please enter an email address to send the test email to." });
            return;
        }
        
        setTestingEmail(true);
        try {
            const result = await sendTestEmail(testEmail);
            if (result.success) {
                toast({ title: "Test Email Sent", description: result.message });
            } else {
                toast({ variant: 'destructive', title: "Test Failed", description: result.message });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message || "Failed to send test email" });
        } finally {
            setTestingEmail(false);
        }
    };

    return (
        <form onSubmit={handleFormSubmit} className="space-y-8">
             <div>
                <h1 className="text-3xl font-bold font-headline">Platform Settings</h1>
                <p className="text-muted-foreground">
                    Manage global configuration for the application.
                </p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Branding</CardTitle>
                    <CardDescription>Customize the look and feel of the application.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="appName">Application Name</Label>
                        <Input id="appName" name="appName" value={localSettings.appName} onChange={handleInputChange} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Application Logo</Label>
                            <div className="flex items-center gap-4">
                                <div 
                                    className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50 cursor-pointer hover:bg-muted"
                                    onClick={() => logoInputRef.current?.click()}
                                >
                                    {logoUrl ? (
                                        <Image src={logoUrl} alt="App Logo" width={96} height={96} className="object-contain p-2"/>
                                    ) : (
                                        <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Upload a logo. Recommended size: 256x256px.</p>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()}>Upload Logo</Button>
                                        <Button type="button" variant="destructive" size="icon" onClick={handleRemoveLogo} disabled={!logoUrl}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                    <Input type="file" ref={logoInputRef} onChange={handleLogoChange} className="hidden" accept="image/*" />
                                </div>
                            </div>
                        </div>

                         <div className="space-y-2">
                            <Label>Application Favicon</Label>
                            <div className="flex items-center gap-4">
                                <div 
                                    className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50 cursor-pointer hover:bg-muted"
                                    onClick={() => faviconInputRef.current?.click()}
                                >
                                    {faviconUrl ? (
                                        <Image src={faviconUrl} alt="App Favicon" width={96} height={96} className="object-contain p-2"/>
                                    ) : (
                                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Upload a favicon. Recommended size: 32x32px or 48x48px.</p>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" onClick={() => faviconInputRef.current?.click()}>Upload Favicon</Button>
                                        <Button type="button" variant="destructive" size="icon" onClick={handleRemoveFavicon} disabled={!faviconUrl}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                    <Input type="file" ref={faviconInputRef} onChange={handleFaviconChange} className="hidden" accept="image/x-icon,image/png,image/svg+xml" />
                                </div>
                            </div>
                        </div>
                    </div>

                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5" /> Storage & CDN</CardTitle>
                    <CardDescription>Configure Wasabi for S3-compatible storage and Bunny.net for CDN delivery.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="wasabiEndpoint">Wasabi Endpoint URL</Label>
                            <Input id="wasabiEndpoint" name="wasabiEndpoint" placeholder="s3.us-west-1.wasabisys.com" value={localSettings.apiKeys.wasabiEndpoint || ''} onChange={(e) => handleNestedChange('apiKeys', e)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="wasabiRegion">Wasabi Region</Label>
                            <Input id="wasabiRegion" name="wasabiRegion" placeholder="us-west-1" value={localSettings.apiKeys.wasabiRegion || ''} onChange={(e) => handleNestedChange('apiKeys', e)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="wasabiBucket">Wasabi Bucket Name</Label>
                            <Input id="wasabiBucket" name="wasabiBucket" placeholder="your-bucket-name" value={localSettings.apiKeys.wasabiBucket || ''} onChange={(e) => handleNestedChange('apiKeys', e)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="bunnyCdnUrl">Bunny.net CDN URL (Optional)</Label>
                            <Input id="bunnyCdnUrl" name="bunnyCdnUrl" placeholder="https://your-pull-zone.b-cdn.net" value={localSettings.apiKeys.bunnyCdnUrl || ''} onChange={(e) => handleNestedChange('apiKeys', e)} />
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="wasabiAccessKey">Wasabi Access Key ID</Label>
                            <Input id="wasabiAccessKey" name="wasabiAccessKey" type="password" value={localSettings.apiKeys.wasabiAccessKey || ''} onChange={(e) => handleNestedChange('apiKeys', e)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="wasabiSecretKey">Wasabi Secret Access Key</Label>
                            <Input id="wasabiSecretKey" name="wasabiSecretKey" type="password" value={localSettings.apiKeys.wasabiSecretKey || ''} onChange={(e) => handleNestedChange('apiKeys', e)} />
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Email & SMTP Settings</CardTitle>
                    <CardDescription>Configure how the application sends emails for notifications, password resets, etc.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="smtpHost">SMTP Host</Label>
                            <Input id="smtpHost" name="smtpHost" placeholder="smtp.example.com" value={localSettings.emailSettings.smtpHost} onChange={(e) => handleNestedChange('emailSettings', e)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="smtpPort">SMTP Port</Label>
                            <Input id="smtpPort" name="smtpPort" type="number" placeholder="587" value={localSettings.emailSettings.smtpPort} onChange={(e) => handleNestedChange('emailSettings', e)} />
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="smtpUser">SMTP Username</Label>
                            <Input id="smtpUser" name="smtpUser" placeholder="your-username" value={localSettings.emailSettings.smtpUser} onChange={(e) => handleNestedChange('emailSettings', e)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="smtpPass">SMTP Password</Label>
                            <Input id="smtpPass" name="smtpPass" type="password" placeholder="••••••••••••" value={localSettings.emailSettings.smtpPass} onChange={(e) => handleNestedChange('emailSettings', e)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="fromAdminEmail">Default "From" Email Address</Label>
                            <Input id="fromAdminEmail" name="fromAdminEmail" type="email" placeholder="noreply@example.com" value={localSettings.emailSettings.fromAdminEmail} onChange={(e) => handleNestedChange('emailSettings', e)} />
                            <p className="text-xs text-muted-foreground">Used for general notifications like signups and password resets.</p>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="fromSupportEmail">Support "From" Email Address</Label>
                            <Input id="fromSupportEmail" name="fromSupportEmail" type="email" placeholder="support@example.com" value={localSettings.emailSettings.fromSupportEmail} onChange={(e) => handleNestedChange('emailSettings', e)} />
                             <p className="text-xs text-muted-foreground">Used for all support ticket correspondence.</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fromName">Sender Name</Label>
                        <Input id="fromName" name="fromName" placeholder="Your App Name" value={localSettings.emailSettings.fromName} onChange={(e) => handleNestedChange('emailSettings', e)} />
                        <p className="text-xs text-muted-foreground">The name that appears in the "From" field of all emails. If not set, app name will be used.</p>
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                        <Label htmlFor="testEmail">Test Email Configuration</Label>
                        <div className="flex gap-2">
                            <Input 
                                id="testEmail" 
                                type="email" 
                                placeholder="Enter email to send test to" 
                                value={testEmail} 
                                onChange={(e) => setTestEmail(e.target.value)} 
                            />
                            <Button 
                                type="button" 
                                onClick={handleTestEmail} 
                                disabled={testingEmail}
                            >
                                {testingEmail ? 'Sending...' : 'Send Test Email'}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Send a test email to verify your SMTP configuration is working correctly.</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Security Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <Label htmlFor="admin-signup-switch" className="text-base font-medium">Allow Super Admin Creation</Label>
                            <CardDescription className="text-sm">
                                Enable or disable the ability for new admins to be created from the User Management page.
                            </CardDescription>
                        </div>
                        <Switch
                            id="admin-signup-switch"
                            checked={allowAdminSignup}
                            onCheckedChange={setAllowAdminSignup}
                        />
                    </div>
                </CardContent>
            </Card>
            
            <div className="flex justify-end sticky bottom-6">
                <Button size="lg" type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    Save All Settings
                </Button>
            </div>
        </form>
    );
}
