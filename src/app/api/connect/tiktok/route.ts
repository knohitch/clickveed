

import { handleOAuthCallback, type PlatformConfig } from '@/server/services/connectionService';

const tiktokConfig: PlatformConfig = {
    platform: 'tiktok',
    clientIdEnvVar: 'tiktokClientKey', // TikTok uses client_key
    clientSecretEnvVar: 'tiktokClientSecret',
    
    getTokens: async (code: string, redirectUri: string, clientId: string, clientSecret: string) => {
        const tokenUrl = `https://open.tiktokapis.com/v2/oauth/token/`;
        const body = new URLSearchParams({
            client_key: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code: code,
        });
        
        const response = await fetch(tokenUrl, { method: 'POST', body, headers: {'Content-Type': 'application/x-www-form-urlencoded'} });
        const data = await response.json();

        if (data.error) throw new Error(`${data.error}: ${data.error_description}` || 'Failed to fetch access token from TikTok.');
        
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
        };
    },

    getUserProfile: async (accessToken: string) => {
        const profileUrl = `https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_large_url`;
        const response = await fetch(profileUrl, { headers: { 'Authorization': `Bearer ${accessToken}` }});
        const data = await response.json();

        if (data.error.code !== 'ok') throw new Error(`${data.error.code}: ${data.error.message}` || 'Failed to fetch user profile from TikTok.');
        
        return {
            id: data.data.user.open_id,
            name: data.data.user.display_name,
        };
    },
    scopes: 'user.info.basic,video.publish',
};

export async function GET(request: Request) {
    return handleOAuthCallback(request, tiktokConfig);
}
