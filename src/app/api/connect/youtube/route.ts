

import { handleOAuthCallback } from '@/server/services/connectionService';
import { type PlatformConfig } from '@/server/services/connectionService';
import { google } from 'googleapis';

const youtubeConfig: PlatformConfig = {
    platform: 'youtube',
    clientIdEnvVar: 'googleClientId',
    clientSecretEnvVar: 'googleClientSecret',
    
    // This function will be executed by the central handler to get the access token.
    getTokens: async (code: string, redirectUri: string, clientId: string, clientSecret: string) => {
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        const { tokens } = await oauth2Client.getToken(code);
        return {
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token ?? null,
            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        };
    },

    // This function will be executed by the central handler to get the user's profile info.
    getUserProfile: async (accessToken: string) => {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

        const channelResponse = await youtube.channels.list({
            part: ['snippet'],
            mine: true,
        });

        const channelName = channelResponse.data.items?.[0]?.snippet?.title || 'YouTube Channel';
        const channelId = channelResponse.data.items?.[0]?.id || '';

        return {
            id: channelId,
            name: channelName,
        };
    },
    // The scopes required for this platform
    scopes: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
};


export async function GET(request: Request) {
    return handleOAuthCallback(request, youtubeConfig);
}
