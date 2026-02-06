'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, Palette, UploadCloud, Trash2, User, Mail, Banknote, Save, Image as ImageIcon, HardDrive, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminSettings, updateAdminSettings, updateEmailSettings } from "@/server/actions/admin-actions";
import { getStorageSettings, updateStorageSettings, testStorageConnection } from "@/server/actions/storage-actions";

export default function ChinSettingsPage() {
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

    const [settings, setSettings] = useState({
        appName: 'AI Video Creator',
        allowAdminSignup: true,
        logoUrl: '',
        faviconUrl: '',
        emailSettings: {
            smtpHost: 'smtp.example.com',
            smtpPort: '587',
            smtpSecure: 'auto',
            smtpUser: 'user@example.com',
            smtpPass: '••••••••',
            fromAdminEmail: 'noreply@example.com',
            fromSupportEmail: 'support@example.com',
            fromName: 'ClickVid Pro',
        },
        storageSettings: {
            wasabiEndpoint: 's3.us-west-1.wasabisys.com',
            wasabiRegion: 'us-west-1',
            wasabiBucket: 'clickvid-media',
            bunnyCdnUrl: 'https://clickvid.b-cdn.net',
            wasabiAccessKey: '••••••••',
            wasabiSecretKey: '••••••••',
        }
    });

  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const adminSettings = await getAdminSettings();
        const storageSettings = await getStorageSettings();

        setSettings(prev => ({
          ...prev,
          appName: adminSettings.appName,
          allowAdminSignup: adminSettings.allowAdminSignup,
          logoUrl: adminSettings.logoUrl || '',
          faviconUrl: adminSettings.faviconUrl || '',
          emailSettings: {
            ...prev.emailSettings,
            smtpHost: adminSettings.emailSettings?.smtpHost || prev.emailSettings.smtpHost,
            smtpPort: adminSettings.emailSettings?.smtpPort || prev.emailSettings.smtpPort,
            smtpSecure: (adminSettings.emailSettings as any)?.smtpSecure || prev.emailSettings.smtpSecure,
            smtpUser: adminSettings.emailSettings?.smtpUser || prev.emailSettings.smtpUser,
            smtpPass: adminSettings.emailSettings?.smtpPass || prev.emailSettings.smtpPass,
            fromName: adminSettings.emailSettings?.fromName || prev.emailSettings.fromName,
            fromAdminEmail: adminSettings.emailSettings?.fromAdminEmail || prev.emailSettings.fromAdminEmail,
            fromSupportEmail: adminSettings.emailSettings?.fromSupportEmail || prev.emailSettings.fromSupportEmail,
          },
          storageSettings: {
            ...prev.storageSettings,
            ...storageSettings,
          }
        }));
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast({
          title: "Error",
          description: "Failed to load settings from database.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({...prev, [name]: value}));
  };
  
  const handleNestedChange = (category: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => {
      const updatedSettings = { ...prev };
      if (category === 'emailSettings') {
        updatedSettings.emailSettings = {
          ...prev.emailSettings,
          [name]: value
        };
      } else if (category === 'storageSettings') {
        updatedSettings.storageSettings = {
          ...prev.storageSettings,
          [name]: value
        };
      }
      return updatedSettings;
    });
  };
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setSettings(prev => ({...prev, logoUrl: dataUrl}));
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
        setSettings(prev => ({...prev, faviconUrl: dataUrl}));
      }
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setSettings(prev => ({...prev, logoUrl: ''}));
  };
  
  const handleRemoveFavicon = () => {
    setSettings(prev => ({...prev, faviconUrl: ''}));
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);

    try {
      const result = await testStorageConnection();

      if (result.success) {
        toast({
          title: "Connection Test Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Connection Test Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      toast({
        title: "Connection Test Failed",
        description: "Failed to test storage connection. Please try again.",
        variant: "destructive"
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestEmail = async () => {
    const testEmailInput = document.getElementById('testEmail') as HTMLInputElement;
    const testEmail = testEmailInput?.value;

    if (!testEmail) {
      toast({
        title: "Test Email Required",
        description: "Please enter a test email address.",
        variant: "destructive"
      });
      return;
    }

    setTestingEmail(true);

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testEmail }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Test Email Sent",
          description: `Test email sent successfully to ${testEmail}. Check your inbox for the email with the current Sender Name.`,
        });
        testEmailInput.value = '';
      } else {
        toast({
          title: "Test Email Failed",
          description: result.error || "Failed to send test email.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Test email failed:', error);
      toast({
        title: "Test Email Failed",
        description: "Failed to send test email. Please check your SMTP configuration.",
        variant: "destructive"
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      // Prepare the settings to save
      const settingsToSave = {
        appName: settings.appName,
        logoUrl: settings.logoUrl || null,
        faviconUrl: settings.faviconUrl || null,
        allowAdminSignup: settings.allowAdminSignup.toString(),
      };

      // Save admin settings to database
      await updateAdminSettings(settingsToSave);

      // Save email settings to database
      await updateEmailSettings({
        id: 1,
        smtpHost: settings.emailSettings.smtpHost,
        smtpPort: settings.emailSettings.smtpPort,
        smtpSecure: settings.emailSettings.smtpSecure || 'auto',
        smtpUser: settings.emailSettings.smtpUser,
        smtpPass: settings.emailSettings.smtpPass,
        fromAdminEmail: settings.emailSettings.fromAdminEmail,
        fromSupportEmail: settings.emailSettings.fromSupportEmail,
        fromName: settings.emailSettings.fromName,
      });

      // Save storage settings to database
      const storageResult = await updateStorageSettings(settings.storageSettings);

      if (!storageResult.success) {
        toast({
          title: "Warning",
          description: `Settings saved but storage configuration failed: ${storageResult.message}`,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Settings Saved",
        description: "All settings have been updated successfully."
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96" />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-24 w-24 rounded-lg" />
                  <Skeleton className="h-10 w-32" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-24 w-24 rounded-lg" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full rounded-lg" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Platform Settings</h1>
        <p className="text-muted-foreground">
          Manage global configuration for the application.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Branding</CardTitle>
              <CardDescription>Customize the look and feel of the application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="appName">Application Name</Label>
                <Input id="appName" name="appName" value={settings.appName} onChange={handleInputChange} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Application Logo</Label>
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50 cursor-pointer hover:bg-muted"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {settings.logoUrl ? (
                        <Image src={settings.logoUrl} alt="App Logo" width={96} height={96} className="object-contain p-2"/>
                      ) : (
                        <UploadCloud className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Upload a logo. Recommended size: 256x256px.</p>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()}>Upload Logo</Button>
                        <Button type="button" variant="destructive" size="icon" onClick={handleRemoveLogo} disabled={!settings.logoUrl}><Trash2 className="h-4 w-4"/></Button>
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
                      {settings.faviconUrl ? (
                        <Image src={settings.faviconUrl} alt="App Favicon" width={96} height={96} className="object-contain p-2"/>
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Upload a favicon. Recommended size: 32x32px or 48x48px.</p>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => faviconInputRef.current?.click()}>Upload Favicon</Button>
                        <Button type="button" variant="destructive" size="icon" onClick={handleRemoveFavicon} disabled={!settings.faviconUrl}><Trash2 className="h-4 w-4"/></Button>
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
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Localization</CardTitle>
              <CardDescription>Configure language and regional settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultLanguage">Default Language</Label>
                  <select 
                    id="defaultLanguage" 
                    className="w-full p-2 border rounded-md bg-background"
                    defaultValue="en"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select 
                    id="timezone" 
                    className="w-full p-2 border rounded-md bg-background"
                    defaultValue="UTC"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5" /> Storage & CDN</CardTitle>
              <CardDescription>Configure Wasabi for S3-compatible storage and Bunny.net for CDN delivery.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wasabiEndpoint">Wasabi Endpoint URL</Label>
                  <Input id="wasabiEndpoint" name="wasabiEndpoint" placeholder="s3.us-west-1.wasabisys.com" value={settings.storageSettings.wasabiEndpoint} onChange={(e) => handleNestedChange('storageSettings', e)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wasabiRegion">Wasabi Region</Label>
                  <Input id="wasabiRegion" name="wasabiRegion" placeholder="us-west-1" value={settings.storageSettings.wasabiRegion} onChange={(e) => handleNestedChange('storageSettings', e)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wasabiBucket">Wasabi Bucket Name</Label>
                  <Input id="wasabiBucket" name="wasabiBucket" placeholder="your-bucket-name" value={settings.storageSettings.wasabiBucket} onChange={(e) => handleNestedChange('storageSettings', e)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bunnyCdnUrl">Bunny.net CDN URL (Optional)</Label>
                  <Input id="bunnyCdnUrl" name="bunnyCdnUrl" placeholder="https://your-pull-zone.b-cdn.net" value={settings.storageSettings.bunnyCdnUrl} onChange={(e) => handleNestedChange('storageSettings', e)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wasabiAccessKey">Wasabi Access Key ID</Label>
                  <Input id="wasabiAccessKey" name="wasabiAccessKey" type="password" value={settings.storageSettings.wasabiAccessKey} onChange={(e) => handleNestedChange('storageSettings', e)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wasabiSecretKey">Wasabi Secret Access Key</Label>
                  <Input id="wasabiSecretKey" name="wasabiSecretKey" type="password" value={settings.storageSettings.wasabiSecretKey} onChange={(e) => handleNestedChange('storageSettings', e)} />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                >
                  {testingConnection ? 'Testing...' : 'Test Connection'}
                </Button>
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
                  <Input id="smtpHost" name="smtpHost" placeholder="smtp.example.com" value={settings.emailSettings.smtpHost} onChange={(e) => handleNestedChange('emailSettings', e)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input id="smtpPort" name="smtpPort" type="number" placeholder="587" value={settings.emailSettings.smtpPort} onChange={(e) => handleNestedChange('emailSettings', e)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">SMTP Username</Label>
                  <Input id="smtpUser" name="smtpUser" placeholder="your-username" value={settings.emailSettings.smtpUser} onChange={(e) => handleNestedChange('emailSettings', e)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPass">SMTP Password</Label>
                  <Input id="smtpPass" name="smtpPass" type="password" placeholder="••••••••••••" value={settings.emailSettings.smtpPass} onChange={(e) => handleNestedChange('emailSettings', e)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromName">Sender Name</Label>
                <Input id="fromName" name="fromName" placeholder="ClickVid Pro" value={settings.emailSettings.fromName} onChange={(e) => handleNestedChange('emailSettings', e)} />
                <p className="text-xs text-muted-foreground">The name that will appear in the "From" field of emails.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fromAdminEmail">Default "From" Email Address</Label>
                  <Input id="fromAdminEmail" name="fromAdminEmail" type="email" placeholder="noreply@example.com" value={settings.emailSettings.fromAdminEmail} onChange={(e) => handleNestedChange('emailSettings', e)} />
                  <p className="text-xs text-muted-foreground">Used for general notifications like signups and password resets.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromSupportEmail">Support "From" Email Address</Label>
                  <Input id="fromSupportEmail" name="fromSupportEmail" type="email" placeholder="support@example.com" value={settings.emailSettings.fromSupportEmail} onChange={(e) => handleNestedChange('emailSettings', e)} />
                  <p className="text-xs text-muted-foreground">Used for all support ticket correspondence.</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="testEmail">Test Email Address</Label>
                  <div className="flex gap-2">
                    <Input
                      id="testEmail"
                      type="email"
                      placeholder="test@example.com"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestEmail}
                      disabled={testingEmail}
                    >
                      {testingEmail ? 'Sending...' : 'Send Test Email'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Send a test email to verify your SMTP configuration and Sender Name settings.
                  </p>
                </div>
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
                  checked={settings.allowAdminSignup}
                  onCheckedChange={(checked) => setSettings(prev => ({...prev, allowAdminSignup: checked}))}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="flex justify-end sticky bottom-6 z-10">
        <Button size="lg" type="submit">
          <Save className="mr-2 h-4 w-4" />
          Save All Settings
        </Button>
      </div>
    </form>
  );
}
