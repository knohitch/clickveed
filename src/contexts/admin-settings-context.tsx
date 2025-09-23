
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { getAdminSettings, updateAdminSettings, updatePlans, updatePromotions, updateApiKeys, updateEmailSettings, updateEmailTemplates } from '@/server/actions/admin-actions';
import type { Prisma } from '@prisma/client';

// Use Prisma-generated types for consistency
export type PlanFeature = Prisma.PlanFeatureGetPayload<{}>;
export type Plan = Prisma.PlanGetPayload<{ include: { features: true } }>;
export type Promotion = Prisma.PromotionGetPayload<{}> & { applicablePlanIds: string[] };

export interface EmailSettings {
  id: number;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  fromAdminEmail: string;
  fromSupportEmail: string;
}

export interface EmailTemplate {
    subject: string;
    body: string;
}

export interface EmailTemplates {
    userSignup: EmailTemplate;
    passwordReset: EmailTemplate;
    subscriptionActivated: EmailTemplate;
    subscriptionRenewal: EmailTemplate;
    subscriptionCanceled: EmailTemplate;
    adminNewUser: EmailTemplate;
    adminSubscriptionCanceled: EmailTemplate;
    adminSubscriptionRenewed: EmailTemplate;
    userNewTicket: EmailTemplate;
    userTicketReply: EmailTemplate;
    userTicketStatusChange: EmailTemplate;
    adminNewTicket: EmailTemplate;
}

export type ApiKeys = Record<string, string>;

// Define the shape of all settings
interface AllSettings {
  appName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  allowAdminSignup: boolean;
  isSupportOnline: boolean;
  apiKeys: ApiKeys;
  plans: Plan[];
  promotions: Promotion[];
  emailSettings: EmailSettings;
  emailTemplates: EmailTemplates;
}

interface AdminSettingsContextType extends AllSettings {
  setAppName: (name: string) => void;
  setLogoUrl: (url: string | null) => void;
  setFaviconUrl: (url: string | null) => void;
  setAllowAdminSignup: (allow: boolean) => void;
  setIsSupportOnline: (online: boolean) => void;
  setApiKeys: (keys: ApiKeys) => void;
  setPlans: (plans: Plan[]) => void;
  setPromotions: (promotions: Promotion[]) => void;
  setEmailSettings: (settings: EmailSettings) => void;
  setEmailTemplates: (templates: EmailTemplates) => void;
  isN8nConfigured: boolean;
  isMakeConfigured: boolean;
  isGoogleAIConfigured: boolean;
  isStripeConfigured: boolean;
  loading: boolean;
}

const AdminSettingsContext = createContext<AdminSettingsContextType | undefined>(undefined);

export function useAdminSettings() {
  const context = useContext(AdminSettingsContext);
  if (context === undefined) {
    throw new Error('useAdminSettings must be used within an AdminSettingsProvider');
  }
  return context;
}

const defaultEmailSettings: EmailSettings = {
    id: 1,
    smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '',
    fromAdminEmail: 'noreply@example.com', fromSupportEmail: 'support@example.com'
};

const defaultEmailTemplates: EmailTemplates = {
    userSignup: { subject: 'Welcome!', body: 'Hello {{name}}...' },
    passwordReset: { subject: 'Password Reset', body: 'Reset here: {{resetLink}}' },
    subscriptionActivated: { subject: 'Subscription Activated', body: 'Thanks for subscribing to {{planName}}.' },
    subscriptionRenewal: { subject: 'Subscription Renewal', body: 'Your plan {{planName}} will renew on {{renewalDate}}.' },
    subscriptionCanceled: { subject: 'Subscription Canceled', body: 'Your plan {{planName}} has been canceled.' },
    adminNewUser: { subject: 'New User Signup', body: 'A new user signed up: {{userEmail}}' },
    adminSubscriptionCanceled: { subject: 'Subscription Canceled', body: '{{userName}} canceled their plan.' },
    adminSubscriptionRenewed: { subject: 'Subscription Renewed', body: '{{userName}} renewed their plan.' },
    userNewTicket: { subject: 'Support Ticket Received', body: 'We received your ticket {{ticketId}}.' },
    userTicketReply: { subject: 'Reply to your ticket', body: 'An agent replied to your ticket {{ticketId}}.' },
    userTicketStatusChange: { subject: 'Ticket Status Updated', body: 'Your ticket {{ticketId}} status is now {{newStatus}}.' },
    adminNewTicket: { subject: 'New Support Ticket', body: 'New ticket from {{userName}}.' },
};

export const initialApiKeysObject: ApiKeys = {
  gemini: '', openai: '', claude: '', azureOpenai: '', openrouter: '', deepseek: '', grok: '', qwen: '', perplexity: '', mistral: '', cohere: '',
  stableDiffusion: '', midjourney: '', dalle: '', imagen: '', dreamstudio: '', leonardo: '', magnific: '',
  googleVeo: '', kling: '', sora: '', wan: '', skyReels: '', pika: '', luma: '', synthesia: '', colossyan: '', runwayml: '', heygen: '', modelscope: '', stableVideo: '', animateDiff: '', videoFusion: '',
  elevenlabs: '', azureTts: '', myshell: '', coqui: '', assemblyai: '', deepgram: '', suno: '', udio: '', lalalai: '',
  n8n: '', make: '', replicate: '', huggingface: '',
  modelslab: '', pexels: '', pixabay: '', unsplash: '',
  stripePublishableKey: '', stripeSecretKey: '', stripeWebhookSecret: '',
  paypalClientId: '', paypalClientSecret: '',
  paystackPublicKey: '', paystackSecretKey: '',
  flutterwavePublicKey: '', flutterwaveSecretKey: '',
  braintreeMerchantId: '', braintreePublicKey: '', braintreePrivateKey: '',
  adyenApiKey: '', adyenClientKey: '',
  squareAppId: '', squareAccessToken: '',
  wasabiEndpoint: '', wasabiRegion: '', wasabiAccessKey: '', wasabiSecretKey: '', wasabiBucket: '', bunnyCdnUrl: '',
  googleClientId: '', googleClientSecret: '',
  facebookClientId: '', facebookClientSecret: '',
  instagramClientId: '', instagramClientSecret: '',
  tiktokClientKey: '', tiktokClientSecret: '',
  snapchatClientId: '', snapchatClientSecret: '',
};

const initialSettings: AllSettings = {
    appName: 'ClickVid Pro',
    logoUrl: null,
    faviconUrl: null,
    allowAdminSignup: true,
    isSupportOnline: true,
    apiKeys: initialApiKeysObject,
    plans: [],
    promotions: [],
    emailSettings: defaultEmailSettings,
    emailTemplates: defaultEmailTemplates,
}

export function AdminSettingsProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AllSettings>(initialSettings);
  
  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        const fetchedSettings = await getAdminSettings();
        setSettings(prev => ({
            ...prev,
            ...fetchedSettings,
            apiKeys: { ...initialApiKeysObject, ...fetchedSettings.apiKeys }
        }));
      } catch (error) {
        console.error("Failed to fetch admin settings:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSettingChange = useCallback(async (key: keyof AllSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    try {
        switch(key) {
            case 'plans':
                await updatePlans(value as Plan[]);
                break;
            case 'promotions':
                 await updatePromotions(value as Promotion[]);
                break;
            case 'apiKeys':
                 await updateApiKeys(value as ApiKeys);
                break;
            case 'emailSettings':
                 await updateEmailSettings(value as EmailSettings);
                 break;
            case 'emailTemplates':
                 await updateEmailTemplates(value as EmailTemplates);
                 break;
            default:
                 await updateAdminSettings({ [key]: value });
        }
    } catch (error) {
        console.error(`Failed to update setting ${key}:`, error);
    }
  }, []);
  
  const value: AdminSettingsContextType = useMemo(() => ({
    ...settings,
    setAppName: (name: string) => handleSettingChange('appName', name),
    setLogoUrl: (url: string | null) => handleSettingChange('logoUrl', url),
    setFaviconUrl: (url: string | null) => handleSettingChange('faviconUrl', url),
    setAllowAdminSignup: (allow: boolean) => handleSettingChange('allowAdminSignup', allow),
    setIsSupportOnline: (online: boolean) => handleSettingChange('isSupportOnline', online),
    setApiKeys: (keys: ApiKeys) => handleSettingChange('apiKeys', keys),
    setPlans: (plans: Plan[]) => handleSettingChange('plans', plans),
    setPromotions: (promotions: Promotion[]) => handleSettingChange('promotions', promotions),
    setEmailSettings: (emailSettings: EmailSettings) => handleSettingChange('emailSettings', emailSettings),
    setEmailTemplates: (templates: EmailTemplates) => handleSettingChange('emailTemplates', templates),
    isN8nConfigured: !!settings.apiKeys.n8n,
    isMakeConfigured: !!settings.apiKeys.make,
    isGoogleAIConfigured: !!settings.apiKeys.gemini,
    isStripeConfigured: !!settings.apiKeys.stripeSecretKey && !!settings.apiKeys.stripePublishableKey,
    loading: loading,
  }), [settings, loading, handleSettingChange]);

  return (
    <AdminSettingsContext.Provider value={value}>
      {children}
    </AdminSettingsContext.Provider>
  );
}
