

'use server';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAdminSettings } from '@/server/actions/admin-actions';
import { upsertConnection } from '@/server/actions/social-actions';

/**
 * Defines the configuration required for each OAuth provider.
 */
export interface PlatformConfig {
  platform: string;
  clientIdEnvVar: string;
  clientSecretEnvVar: string;
  getTokens: (code: string, redirectUri: string, clientId: string, clientSecret: string) => Promise<{
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
  }>;
  getUserProfile: (accessToken: string) => Promise<{
    id: string;
    name: string;
  }>;
  scopes?: string;
}

const getBaseUrl = (reqUrl: string) => {
    const url = new URL(reqUrl);
    return `${url.protocol}//${url.host}`;
};


/**
 * A centralized handler for the OAuth callback process.
 * @param request The incoming request from the OAuth provider.
 * @param config The platform-specific configuration.
 * @returns A NextResponse object, either redirecting on success/failure or returning a JSON error.
 */
export async function handleOAuthCallback(request: Request, config: PlatformConfig) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'User is not authenticated.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');
  
  const baseUrl = getBaseUrl(request.url);
  const redirectUri = `${baseUrl}/api/connect/${config.platform}`;
  const integrationsUrl = new URL('/dashboard/social-suite/integrations', baseUrl);

  if (errorParam) {
    integrationsUrl.searchParams.set('error', `Authorization failed on ${config.platform}: ${errorParam}`);
    return NextResponse.redirect(integrationsUrl);
  }

  if (!code) {
    integrationsUrl.searchParams.set('error', 'Authorization code not provided.');
    return NextResponse.redirect(integrationsUrl);
  }

  try {
    const { apiKeys } = await getAdminSettings();
    const clientId = apiKeys[config.clientIdEnvVar];
    const clientSecret = apiKeys[config.clientSecretEnvVar];

    if (!clientId || !clientSecret) {
        const errorMessage = `This integration has not been configured by the administrator. Missing Client ID or Secret for ${config.platform}.`;
        console.warn(errorMessage);
        integrationsUrl.searchParams.set('error', encodeURIComponent(errorMessage));
        return NextResponse.redirect(integrationsUrl);
    }

    const { accessToken, refreshToken, expiresAt } = await config.getTokens(code, redirectUri, clientId, clientSecret);
    const { name: profileName } = await config.getUserProfile(accessToken);

    await upsertConnection({
        userId: session.user.id,
        platform: config.platform,
        name: profileName,
        accessToken,
        refreshToken,
        expiresAt,
    });
    
    integrationsUrl.searchParams.set('connected', config.platform);
    return NextResponse.redirect(integrationsUrl);

  } catch (error) {
    console.error(`${config.platform} connection error:`, error);
    const errorMessage = error instanceof Error ? error.message : `An unknown error occurred while connecting to ${config.platform}.`;
    integrationsUrl.searchParams.set('error', encodeURIComponent(errorMessage));
    return NextResponse.redirect(integrationsUrl);
  }
}
