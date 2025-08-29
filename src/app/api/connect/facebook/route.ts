

import { handleOAuthCallback, type PlatformConfig } from '@/server/services/connectionService';

const facebookConfig: PlatformConfig = {
    platform: 'facebook',
    clientIdEnvVar: 'facebookClientId',
    clientSecretEnvVar: 'facebookClientSecret',
    
    // The server-to-server call to get the access token
    getTokens: async (code: string, redirectUri: string, clientId: string, clientSecret: string) => {
        const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`;
        const response = await fetch(tokenUrl);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Failed to fetch access token from Facebook.');
        
        return {
            accessToken: data.access_token,
            refreshToken: null, // Facebook short-lived tokens are exchanged for long-lived ones, but we simplify here
            expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
        };
    },

    // The call to get the user's profile information
    getUserProfile: async (accessToken: string) => {
        const profileUrl = `https://graph.facebook.com/me?fields=id,name&access_token=${accessToken}`;
        const response = await fetch(profileUrl);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Failed to fetch user profile from Facebook.');
        
        return {
            id: data.id,
            name: data.name,
        };
    },
    scopes: 'pages_show_list,pages_read_engagement,pages_manage_posts,public_profile,email',
};


export async function GET(request: Request) {
    return handleOAuthCallback(request, facebookConfig);
}
