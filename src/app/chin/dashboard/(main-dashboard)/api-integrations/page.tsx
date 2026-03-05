'use client';

import React from "react";
import { AlertTriangle, Banknote, Bot, Cloud, ImageIcon, KeyRound, MicVocal, Save, Share2, Video, Workflow } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiCategoryCard, ApiKeyInput } from "@/components/admin/api-category-card";
import { useAdminSettings } from "@/contexts/admin-settings-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ApiKeys } from "@/contexts/admin-settings-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type CategoryConfig = {
  title: string;
  icon: React.ElementType;
  keys: string[];
};

const CATEGORY_CONFIG: CategoryConfig[] = [
  {
    title: "Language Models",
    icon: Bot,
    keys: ['gemini', 'openai', 'azureOpenai', 'claude', 'openrouter', 'deepseek', 'grok', 'qwen', 'perplexity', 'mistral', 'cohere', 'huggingface'],
  },
  {
    title: "Image Generation",
    icon: ImageIcon,
    keys: ['replicate', 'imagen', 'stableDiffusion', 'dreamstudio', 'midjourney', 'dalle', 'leonardo', 'magnific', 'modelslab'],
  },
  {
    title: "Video Generation",
    icon: Video,
    keys: ['googleVeo', 'seedance', 'wan', 'kling', 'sora', 'skyReels', 'pika', 'luma', 'synthesia', 'colossyan', 'runwayml', 'heygen', 'modelscope', 'stableVideo', 'animateDiff', 'videoFusion'],
  },
  {
    title: "Audio / Speech",
    icon: MicVocal,
    keys: ['minimax', 'elevenlabs', 'azureTts', 'myshell', 'coqui', 'assemblyai', 'deepgram', 'suno', 'udio', 'lalalai'],
  },
  {
    title: "Workflow & Automation",
    icon: Workflow,
    keys: ['n8n', 'make'],
  },
  {
    title: "Stock Media APIs",
    icon: KeyRound,
    keys: ['pexels', 'pixabay', 'unsplash'],
  },
  {
    title: "Storage & CDN",
    icon: Cloud,
    keys: ['wasabiEndpoint', 'wasabiRegion', 'wasabiBucket', 'wasabiAccessKey', 'wasabiSecretKey', 'bunnyCdnUrl'],
  },
  {
    title: "Google Vertex Setup",
    icon: Cloud,
    keys: ['googleCloudProjectId', 'googleApplicationCredentialsJson'],
  },
  {
    title: "Social OAuth",
    icon: Share2,
    keys: ['googleClientId', 'googleClientSecret', 'facebookClientId', 'facebookClientSecret', 'instagramClientId', 'instagramClientSecret', 'tiktokClientKey', 'tiktokClientSecret', 'snapchatClientId', 'snapchatClientSecret', 'whatsappClientId', 'whatsappClientSecret', 'threadsClientId', 'threadsClientSecret', 'linkedinClientId', 'linkedinClientSecret', 'xClientId', 'xClientSecret'],
  },
  {
    title: "Payment Gateways",
    icon: Banknote,
    keys: ['stripePublishableKey', 'stripeSecretKey', 'stripeWebhookSecret', 'paypalClientId', 'paypalClientSecret', 'paystackPublicKey', 'paystackSecretKey', 'flutterwavePublicKey', 'flutterwaveSecretKey', 'braintreeMerchantId', 'braintreePublicKey', 'braintreePrivateKey', 'adyenApiKey', 'adyenClientKey', 'squareAppId', 'squareAccessToken'],
  },
];

const LABEL_OVERRIDES: Record<string, string> = {
  // --- Language Models ---
  openai: 'OpenAI API Key',
  azureOpenai: 'Azure OpenAI API Key',
  openrouter: 'OpenRouter API Key',
  huggingface: 'HuggingFace API Key',

  // --- Image Generation ---
  dalle: 'DALL-E API Key',
  modelslab: 'ModelsLab API Key',

  // --- Video Generation ---
  heygen: 'HeyGen API Key',
  runwayml: 'RunwayML API Key',
  skyReels: 'SkyReels API Key',

  // --- Audio / Speech ---
  elevenlabs: 'ElevenLabs API Key',
  azureTts: 'Azure TTS API Key',
  myshell: 'MyShell API Key',
  assemblyai: 'AssemblyAI API Key',
  minimax: 'MiniMax API Key',

  // --- Workflow ---
  n8n: 'n8n API Key',

  // --- Storage & CDN (these are NOT API keys — they are config values) ---
  wasabiEndpoint: 'Wasabi Endpoint URL',
  wasabiRegion: 'Wasabi Region',
  wasabiBucket: 'Wasabi Bucket Name',
  wasabiAccessKey: 'Wasabi Access Key ID',
  wasabiSecretKey: 'Wasabi Secret Access Key',
  bunnyCdnUrl: 'Bunny.net CDN URL (Optional)',

  // --- Google Vertex Setup ---
  googleCloudProjectId: 'Google Cloud Project ID',
  googleApplicationCredentialsJson: 'Google Service Account JSON',

  // --- Social OAuth (Client IDs/Secrets are not "API Keys") ---
  googleClientId: 'Google Client ID',
  googleClientSecret: 'Google Client Secret',
  facebookClientId: 'Facebook Client ID',
  facebookClientSecret: 'Facebook Client Secret',
  instagramClientId: 'Instagram Client ID',
  instagramClientSecret: 'Instagram Client Secret',
  tiktokClientKey: 'TikTok Client Key',
  tiktokClientSecret: 'TikTok Client Secret',
  snapchatClientId: 'Snapchat Client ID',
  snapchatClientSecret: 'Snapchat Client Secret',
  whatsappClientId: 'WhatsApp Client ID',
  whatsappClientSecret: 'WhatsApp Client Secret',
  threadsClientId: 'Threads Client ID',
  threadsClientSecret: 'Threads Client Secret',
  linkedinClientId: 'LinkedIn Client ID',
  linkedinClientSecret: 'LinkedIn Client Secret',
  xClientId: 'X (Twitter) Client ID',
  xClientSecret: 'X (Twitter) Client Secret',

  // --- Payment Gateways ---
  stripePublishableKey: 'Stripe Publishable Key',
  stripeSecretKey: 'Stripe Secret Key',
  stripeWebhookSecret: 'Stripe Webhook Secret',
  paypalClientId: 'PayPal Client ID',
  paypalClientSecret: 'PayPal Client Secret',
  paystackPublicKey: 'Paystack Public Key',
  paystackSecretKey: 'Paystack Secret Key',
  flutterwavePublicKey: 'Flutterwave Public Key',
  flutterwaveSecretKey: 'Flutterwave Secret Key',
  braintreeMerchantId: 'Braintree Merchant ID',
  braintreePublicKey: 'Braintree Public Key',
  braintreePrivateKey: 'Braintree Private Key',
  adyenClientKey: 'Adyen Client Key',
  squareAppId: 'Square App ID',
  squareAccessToken: 'Square Access Token',
};

function toHumanLabel(key: string): string {
  if (LABEL_OVERRIDES[key]) {
    return LABEL_OVERRIDES[key];
  }
  const pretty = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());
  return `${pretty} API Key`;
}

export default function ApiIntegrationsPage() {
  const { loading, apiKeys, setApiKeys } = useAdminSettings();
  const [localApiKeys, setLocalApiKeys] = React.useState<ApiKeys>(apiKeys);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setLocalApiKeys(apiKeys);
  }, [apiKeys]);

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalApiKeys((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await setApiKeys(localApiKeys);
      toast({ title: "API Keys Saved", description: "All API keys have been updated successfully." });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Error Saving",
        description: error.message || "Failed to save API keys. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
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
    );
  }

  const allConfiguredKeys = Object.keys(localApiKeys);
  const categorizedKeys = new Set(CATEGORY_CONFIG.flatMap((category) => category.keys));
  const uncategorizedKeys = allConfiguredKeys.filter((key) => !categorizedKeys.has(key));

  const categories: CategoryConfig[] = uncategorizedKeys.length > 0
    ? [...CATEGORY_CONFIG, { title: 'Other Keys', icon: KeyRound, keys: uncategorizedKeys }]
    : CATEGORY_CONFIG;

  const leftColumn = categories.filter((_, index) => index % 2 === 0);
  const rightColumn = categories.filter((_, index) => index % 2 === 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">API Integrations</h1>
        <p className="text-muted-foreground">
          Manage API keys and connections for third-party services. Your keys are stored securely.
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Imagen / Google Veo Setup</AlertTitle>
        <AlertDescription>
          For `imagen` and `googleVeo`, set `Google Cloud Project ID` plus OAuth credentials. Recommended: `Google Service Account JSON`. Legacy fallback: place a short-lived OAuth access token in the `imagen` or `googleVeo` key.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-8">
          {leftColumn.map((category) => (
            <ApiCategoryCard key={category.title} title={category.title} icon={category.icon}>
              {category.keys.map((key) => (
                <ApiKeyInput
                  key={key}
                  name={key}
                  label={toHumanLabel(key)}
                  value={localApiKeys[key] || ''}
                  onChange={handleKeyChange}
                  multiline={key === 'googleApplicationCredentialsJson'}
                  inputType={key === 'googleCloudProjectId' ? 'text' : 'password'}
                />
              ))}
            </ApiCategoryCard>
          ))}
        </div>

        <div className="space-y-8">
          {rightColumn.map((category) => (
            <ApiCategoryCard key={category.title} title={category.title} icon={category.icon}>
              {category.keys.map((key) => (
                <ApiKeyInput
                  key={key}
                  name={key}
                  label={toHumanLabel(key)}
                  value={localApiKeys[key] || ''}
                  onChange={handleKeyChange}
                  multiline={key === 'googleApplicationCredentialsJson'}
                  inputType={key === 'googleCloudProjectId' ? 'text' : 'password'}
                />
              ))}
            </ApiCategoryCard>
          ))}
        </div>
      </div>

      <div className="flex justify-end sticky bottom-6">
        <Button size="lg" onClick={handleSaveAll} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>
    </div>
  );
}
