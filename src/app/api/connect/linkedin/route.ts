

import { handleOAuthCallback, type PlatformConfig } from '@/server/services/connectionService';

const linkedinConfig: PlatformConfig = {
    platform: 'linkedin',
    clientIdEnvVar: 'linkedinClientId',
    clientSecretEnvVar: 'linkedinClientSecret',

    getTokens: async (code: string, redirectUri: string, clientId: string, clientSecret: string) => {
        const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret,
        });

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.error_description || 'Failed to fetch access token from LinkedIn.');

        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token ?? null,
            expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
        };
    },

    getUserProfile: async (accessToken: string) => {
        const response = await fetch('https://api.linkedin.com/v2/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Failed to fetch user profile from LinkedIn.');

        return {
            id: data.id,
            name: `${data.localizedFirstName ?? ''} ${data.localizedLastName ?? ''}`.trim() || data.id,
        };
    },
    scopes: 'r_liteprofile r_emailaddress w_member_social',
};

export async function GET(request: Request) {
    return handleOAuthCallback(request, linkedinConfig);
}
