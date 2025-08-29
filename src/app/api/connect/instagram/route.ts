

import { handleOAuthCallback, type PlatformConfig } from '@/server/services/connectionService';

const instagramConfig: PlatformConfig = {
    platform: 'instagram',
    clientIdEnvVar: 'instagramClientId',
    clientSecretEnvVar: 'instagramClientSecret',
    
    getTokens: async (code: string, redirectUri: string, clientId: string, clientSecret: string) => {
        // Instagram's token exchange is a POST request with form data
        const tokenUrl = `https://api.instagram.com/oauth/access_token`;
        const body = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code: code,
        });

        const response = await fetch(tokenUrl, { method: 'POST', body });
        const data = await response.json();

        if (!response.ok) throw new Error(data.error_message || 'Failed to fetch access token from Instagram.');
        
        return {
            accessToken: data.access_token,
            refreshToken: null, // Instagram's basic display API doesn't provide refresh tokens
            expiresAt: null, // Long-lived tokens don't have an explicit expiry date
        };
    },

    getUserProfile: async (accessToken: string) => {
        const profileUrl = `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`;
        const response = await fetch(profileUrl);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error?.message || 'Failed to fetch user profile from Instagram.');
        
        return {
            id: data.id,
            name: data.username,
        };
    },
    scopes: 'user_profile,user_media',
};

export async function GET(request: Request) {
    return handleOAuthCallback(request, instagramConfig);
}
