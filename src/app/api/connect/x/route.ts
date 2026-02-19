
import { handleOAuthCallback, type PlatformConfig } from '@/server/services/connectionService';

const xConfig: PlatformConfig = {
    platform: 'x',
    clientIdEnvVar: 'xClientId',
    clientSecretEnvVar: 'xClientSecret',

    getTokens: async (code: string, redirectUri: string, clientId: string, clientSecret: string) => {
        const tokenUrl = 'https://api.twitter.com/2/oauth2/token';

        // X uses Basic Auth (clientId:clientSecret base64 encoded) for confidential clients
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            // PKCE: plain code_verifier matches the "challenge" sent in getOAuthUrl
            code_verifier: 'challenge',
        });

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${credentials}`,
            },
            body,
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.error_description || data.error || 'Failed to fetch access token from X.');

        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token ?? null,
            expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
        };
    },

    getUserProfile: async (accessToken: string) => {
        const response = await fetch('https://api.twitter.com/2/users/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.detail || 'Failed to fetch user profile from X.');

        return {
            id: data.data?.id ?? '',
            name: data.data?.name ?? data.data?.username ?? '',
        };
    },
    scopes: 'tweet.read tweet.write users.read offline.access',
};

export async function GET(request: Request) {
    return handleOAuthCallback(request, xConfig);
}
