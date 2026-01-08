
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getAvailableTextGenerator, getAvailableImageGenerator, getAvailableVideoGenerator, getAvailableTTSProvider } from '@/lib/ai/api-service-manager';
import { createProviderClient } from '@/lib/ai/provider-clients';

export async function POST(request: Request) {
    const authHeader = headers().get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("Running Autorotation Health Check Cron Job...");
    
    // Test text generation providers
    try {
        const textProvider = await getAvailableTextGenerator();
        const textClient = await createProviderClient(textProvider.provider);
        if (textClient.generateText) {
            await textClient.generateText([{ role: 'user', content: [{ text: 'Hello, world!' }] }]);
            console.log(`Text provider ${textProvider.provider} is healthy`);
        }
    } catch (error) {
        console.error('Text provider health check failed:', error);
    }

    // Test image generation providers
    try {
        const imageProvider = await getAvailableImageGenerator();
        const imageClient = await createProviderClient(imageProvider.provider);
        if (imageClient.generateImage) {
            await imageClient.generateImage('A test image');
            console.log(`Image provider ${imageProvider.provider} is healthy`);
        }
    } catch (error) {
        console.error('Image provider health check failed:', error);
    }

    // Test video generation providers
    try {
        const videoProvider = await getAvailableVideoGenerator();
        const videoClient = await createProviderClient(videoProvider.provider);
        if (videoClient.generateVideo) {
            await videoClient.generateVideo('A test video');
            console.log(`Video provider ${videoProvider.provider} is healthy`);
        }
    } catch (error) {
        console.error('Video provider health check failed:', error);
    }
    
    // Test TTS providers
    try {
        const ttsProvider = await getAvailableTTSProvider();
        const ttsClient = await createProviderClient(ttsProvider.provider);
        if (ttsClient.generateSpeech) {
            await ttsClient.generateSpeech('Hello, world!');
            console.log(`TTS provider ${ttsProvider.provider} is healthy`);
        }
    } catch (error) {
        console.error('TTS provider health check failed:', error);
    }
    
    console.log("Autorotation Health Check complete.");

    return NextResponse.json({ success: true });
}
