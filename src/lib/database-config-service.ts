/**
 * Database-driven configuration service
 * Reads feature tiers and provider metadata from database
 */

import prisma from './prisma';

export interface ProviderMetadata {
  authType: 'apiKey' | 'oauth' | 'none';
  requiresSetup: boolean;
  setupInstructions?: string;
}

// Provider metadata defaults (fallback if not in database)
const DEFAULT_PROVIDER_METADATA: Record<string, ProviderMetadata> = {
  openai: { authType: 'apiKey', requiresSetup: false },
  azureOpenai: { authType: 'apiKey', requiresSetup: false },
  claude: { authType: 'apiKey', requiresSetup: false },
  minimax: { authType: 'apiKey', requiresSetup: false },
  elevenlabs: { authType: 'apiKey', requiresSetup: false },
  replicate: { authType: 'apiKey', requiresSetup: false },
  huggingface: { authType: 'apiKey', requiresSetup: false },
  imagen: {
    authType: 'oauth',
    requiresSetup: true,
    setupInstructions: 'Google Cloud Vertex AI requires OAuth2 authentication with a service account. Set GOOGLE_APPLICATION_CREDENTIALS environment variable.'
  },
  googleVeo: {
    authType: 'oauth',
    requiresSetup: true,
    setupInstructions: 'Google Cloud Vertex AI requires OAuth2 authentication with a service account. Set GOOGLE_APPLICATION_CREDENTIALS environment variable.'
  },
  heygen: { authType: 'apiKey', requiresSetup: false },
  seedance: { authType: 'apiKey', requiresSetup: false },
  wan: { authType: 'apiKey', requiresSetup: false },
};

/**
 * Get provider metadata from database or use defaults
 */
export async function getProviderMetadata(providerName: string): Promise<ProviderMetadata> {
  try {
    const setting = await prisma.setting.findFirst({
      where: { key: `provider-${providerName}` }
    });

    if (setting?.value) {
      return JSON.parse(setting.value);
    }

    const defaultMeta = DEFAULT_PROVIDER_METADATA[providerName as keyof typeof DEFAULT_PROVIDER_METADATA];
    return defaultMeta ?? {
      authType: 'apiKey' as const,
      requiresSetup: false
    };
  } catch (error) {
    console.error(`Failed to load provider metadata for ${providerName}:`, error);
    const defaultMeta = DEFAULT_PROVIDER_METADATA[providerName as keyof typeof DEFAULT_PROVIDER_METADATA];
    return defaultMeta ?? {
      authType: 'apiKey' as const,
      requiresSetup: false
    };
  }
}

/**
 * Check if provider requires OAuth setup
 */
export async function requiresOAuth(provider: string): Promise<boolean> {
  const metadata = await getProviderMetadata(provider);
  return metadata.authType === 'oauth';
}

/**
 * Get list of OAuth providers
 */
export async function getOAuthProviders(): Promise<string[]> {
  const providers = Object.keys(DEFAULT_PROVIDER_METADATA);
  const oauthProviders = [];
  
  for (const provider of providers) {
    const requiresOauth = await requiresOAuth(provider);
    if (requiresOauth) {
      oauthProviders.push(provider);
    }
  }
  
  return oauthProviders;
}

/**
 * Update provider metadata in database
 */
export async function updateProviderMetadata(
  providerName: string,
  metadata: Partial<ProviderMetadata>
): Promise<void> {
  try {
    const existing = await prisma.setting.findFirst({
      where: { key: `provider-${providerName}` }
    });
    
    const value = JSON.stringify({
      ...DEFAULT_PROVIDER_METADATA[providerName as keyof typeof DEFAULT_PROVIDER_METADATA],
      ...metadata
    });
    
    if (existing) {
      await prisma.setting.update({
        where: { key: `provider-${providerName}` },
        data: { value }
      });
    } else {
      await prisma.setting.create({
        data: {
          key: `provider-${providerName}`,
          value
        }
      });
    }
  } catch (error) {
    console.error(`Failed to update provider metadata for ${providerName}:`, error);
    throw error;
  }
}
