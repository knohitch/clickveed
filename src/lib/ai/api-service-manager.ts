'use server';

/**
 * @fileOverview Manages and rotates through available AI service providers.
 * This file centralizes the logic for selecting an provider based on
 * configured API keys, ensuring features degrade gracefully if a key is missing.
 */
import { ai, createGenkitInstance, getOpenAIClient } from '@/ai/genkit';
import { type Tool } from 'genkit';
import { googleAI, type GoogleAIPlugin } from '@genkit-ai/googleai';
import { z } from 'zod';
import { searchPexelsTool } from '@/server/ai/tools/pexels-tool';
import { searchPixabayTool } from '@/server/ai/tools/pixabay-tool';
import { getUnsplashRandomPhoto } from '@/server/ai/tools/unsplash-tool';
import { searchPexelsVideosTool } from '@/server/ai/tools/pexels-video-tool';
import { getAdminSettings } from '@/server/actions/admin-actions';
import { initialApiKeysObject } from '@/contexts/admin-settings-context';
import OpenAI from 'openai';
import { createProviderClient } from './provider-clients';

// Define request types locally as they are no longer exported from genkit
type MessageRole = 'user' | 'model' | 'system' | 'tool';

interface Message {
  role: MessageRole;
  content: Array<{ text: string }>;
}

interface GenerateRequest {
  model?: string;
  messages: Message[];
  config?: any;
}

interface GenerateStreamRequest extends GenerateRequest {}

type ProviderName = keyof typeof initialApiKeysObject;

interface ProviderConfig {
    name: ProviderName;
    model: string; // Changed from ModelReference<any> to string
}

interface ProviderInfo {
    model: string;
    provider: string;
    apiKey: string;
}

// LLM Providers Priority List
const llmProviderPriority: ProviderConfig[] = [
    // OpenAI providers
    { name: 'openai', model: 'openai/gpt-4o' },
    { name: 'azureOpenai', model: 'openai/gpt-4o' },
    
    // Google AI providers
    { name: 'gemini', model: 'googleai/gemini-1.5-flash' },
    
    // Anthropic providers
    { name: 'claude', model: 'anthropic/claude-3-5-sonnet' },
    
    // Other LLM providers
    { name: 'deepseek', model: 'openai/gpt-4o' },
    { name: 'grok', model: 'openai/gpt-4o' },
    { name: 'qwen', model: 'openai/gpt-4o' },
    { name: 'perplexity', model: 'openai/gpt-4o' },
    { name: 'openrouter', model: 'openai/gpt-4o' },
    { name: 'huggingface', model: 'openai/gpt-4o' },
];

// Image Generation Providers Priority List
const imageProviderPriority: ProviderConfig[] = [
    // Google AI providers
    { name: 'gemini', model: 'googleai/gemini-1.5-flash' },
    
    // Other image generation providers
    { name: 'stableDiffusion', model: 'openai/gpt-4o' },
    { name: 'midjourney', model: 'openai/gpt-4o' },
    { name: 'imagen', model: 'openai/gpt-4o' },
    { name: 'dreamstudio', model: 'openai/gpt-4o' },
    { name: 'replicate', model: 'openai/gpt-4o' },
    { name: 'modelslab', model: 'openai/gpt-4o' },
];

// Video Generation Providers Priority List
const videoProviderPriority: ProviderConfig[] = [
    // Google VEO
    { name: 'googleVeo', model: 'googleai/veo-2.0-generate-001' },
    
    // Other video generation providers
    { name: 'heygen', model: 'openai/gpt-4o' },
    { name: 'kling', model: 'openai/gpt-4o' },
    { name: 'seedance', model: 'openai/gpt-4o' },
    { name: 'wan', model: 'openai/gpt-4o' },
    { name: 'modelscope', model: 'openai/gpt-4o' },
    { name: 'stableVideo', model: 'openai/gpt-4o' },
    { name: 'animateDiff', model: 'openai/gpt-4o' },
    { name: 'videoFusion', model: 'openai/gpt-4o' },
];

// TTS Providers Priority List
const ttsProviderPriority: ProviderConfig[] = [
    // Google AI providers
    { name: 'gemini', model: 'googleai/gemini-1.5-flash-tts' as any },
    
    // Other TTS providers
    { name: 'elevenlabs', model: 'openai/gpt-4o' },
    { name: 'azureTts', model: 'openai/gpt-4o' },
    { name: 'myshell', model: 'openai/gpt-4o' },
    { name: 'coqui', model: 'openai/gpt-4o' },
];

// This function returns information about the available provider
// based on API keys configured in the admin settings
async function getAvailableProvider(priorityList: ProviderConfig[], type: string): Promise<ProviderInfo> {
    const { apiKeys } = await getAdminSettings();
    
    for (const provider of priorityList) {
        const apiKey = apiKeys[provider.name as keyof typeof apiKeys];
        
        if (apiKey) {
            // Return both the model string and the provider config
            return {
                model: provider.model,
                provider: provider.name,
                apiKey
            };
        }
    }
    throw new Error(`No API key configured for any enabled ${type} provider. Please configure at least one in the admin panel.`);
}

export async function getAvailableTextGenerator() {
    return getAvailableProvider(llmProviderPriority, 'text');
}

export async function getAvailableImageGenerator() {
    return getAvailableProvider(imageProviderPriority, 'image');
}

export async function getAvailableVideoGenerator() {
    return getAvailableProvider(videoProviderPriority, 'video');
}

export async function getAvailableTTSProvider() {
    return getAvailableProvider(ttsProviderPriority, 'TTS');
}

export async function getAvailableStockPhotoTool() {
    const { apiKeys } = await getAdminSettings();
    const toolPriority = ['pexels', 'pixabay', 'unsplash'];
    const toolMap: Record<string, Tool> = {
        pexels: searchPexelsTool,
        pixabay: searchPixabayTool,
        unsplash: getUnsplashRandomPhoto
    }

    for (const toolKey of toolPriority) {
        if (apiKeys[toolKey as keyof typeof apiKeys]) {
            return toolMap[toolKey];
        }
    }
    
    throw new Error("No stock photo API key configured. Please set PEXELS_API_KEY, PIXABAY_API_KEY, or UNSPLASH_API_KEY in your environment.");
}

/**
 * Get available stock video tool based on configured API keys
 * Currently only supports Pexels for videos
 */
export async function getAvailableStockVideoTool() {
    const { apiKeys } = await getAdminSettings();
    
    // For now, we only have Pexels for videos, but this structure
    // allows for adding more providers in the future
    if (apiKeys.pexels) {
        return searchPexelsVideosTool;
    }
    
    throw new Error("No stock video API key configured. Please set PEXELS_API_KEY in the admin settings.");
}

// These functions create a new Genkit instance with the appropriate API keys
// for each request, ensuring the correct provider is used
export async function generateWithProvider(req: Omit<GenerateRequest, 'model'>) {
    const providerInfo = await getAvailableTextGenerator();
    
    // Use custom client implementations for providers that don't have Genkit plugins
    const customProviders = ['openai', 'azureOpenai', 'claude', 'huggingface'];
    
    if (customProviders.includes(providerInfo.provider)) {
        try {
            const client = createProviderClient(providerInfo.provider, providerInfo.apiKey);
            const response = await client.generateText(req.messages);
            
            // Return in Genkit-compatible format
            return {
                model: providerInfo.model,
                result: {
                    role: 'model' as const,
                    content: [{ text: response.text }]
                }
            };
        } catch (error) {
            console.error(`Error generating text with ${providerInfo.provider}:`, error);
            throw error;
        }
    } else {
        // For providers with Genkit plugins, use Genkit
        const genkitInstance = createGenkitInstance({ [providerInfo.provider]: providerInfo.apiKey });
        return genkitInstance.generate({ ...req, model: providerInfo.model });
    }
}

export async function generateStreamWithProvider(req: Omit<GenerateStreamRequest, 'model'>) {
    const providerInfo = await getAvailableTextGenerator();
    
    // Use custom client implementations for providers that support streaming
    const customProviders = ['openai', 'azureOpenai', 'claude'];
    
    if (customProviders.includes(providerInfo.provider)) {
        try {
            const client = createProviderClient(providerInfo.provider, providerInfo.apiKey);
            const stream = await client.generateTextStream(req.messages);
            
            // Create a Genkit-compatible response
            return {
                stream,
                response: Promise.resolve(null)
            };
        } catch (error) {
            console.error(`Error streaming text with ${providerInfo.provider}:`, error);
            throw error;
        }
    } else {
        // For providers with Genkit plugins, use Genkit
        const genkitInstance = createGenkitInstance({ [providerInfo.provider]: providerInfo.apiKey });
        return genkitInstance.generateStream({ ...req, model: providerInfo.model });
    }
}

export async function generateImageWithProvider(req: Omit<GenerateRequest, 'model'>) {
    const providerInfo = await getAvailableImageGenerator();
    
    // Use custom client implementations for image providers
    const customProviders = ['replicate', 'stableDiffusion', 'midjourney', 'imagen'];
    
    if (customProviders.includes(providerInfo.provider)) {
        try {
            const client = createProviderClient(providerInfo.provider, providerInfo.apiKey);
            // For image generation, we would need to extract the prompt from the request
            // This is a simplified implementation
            const prompt = req.messages.map(msg => msg.content[0].text).join(' ');
            const response = await client.generateImage(prompt);
            
            // Return in Genkit-compatible format
            return {
                model: providerInfo.model,
                result: {
                    role: 'model' as const,
                    content: [{ text: `Image generated: ${response.imageUrl}` }]
                }
            };
        } catch (error) {
            console.error(`Error generating image with ${providerInfo.provider}:`, error);
            throw error;
        }
    } else {
        // For providers with Genkit plugins, use Genkit
        const genkitInstance = createGenkitInstance({ [providerInfo.provider]: providerInfo.apiKey });
        return genkitInstance.generate({ ...req, model: providerInfo.model });
    }
}

export async function generateVideoWithProvider(req: Omit<GenerateRequest, 'model'>) {
    const providerInfo = await getAvailableVideoGenerator();
    
    // Use custom client implementations for video providers
    const customProviders = ['heygen', 'kling', 'modelscope', 'seedance', 'wan'];
    
    if (customProviders.includes(providerInfo.provider)) {
        try {
            const client = createProviderClient(providerInfo.provider, providerInfo.apiKey);
            // For video generation, we would need to extract the prompt from the request
            // This is a simplified implementation
            const prompt = req.messages.map(msg => msg.content[0].text).join(' ');
            const response = await client.generateVideo(prompt);
            
            // Return in Genkit-compatible format
            return {
                model: providerInfo.model,
                result: {
                    role: 'model' as const,
                    content: [{ text: `Video generated: ${response.videoUrl}` }]
                }
            };
        } catch (error) {
            console.error(`Error generating video with ${providerInfo.provider}:`, error);
            throw error;
        }
    } else {
        // For providers with Genkit plugins, use Genkit
        const genkitInstance = createGenkitInstance({ [providerInfo.provider]: providerInfo.apiKey });
        return genkitInstance.generate({ ...req, model: providerInfo.model });
    }
}

export async function generateTtsWithProvider(req: Omit<GenerateRequest, 'model'>) {
    const providerInfo = await getAvailableTTSProvider();
    
    // Use custom client implementations for TTS providers
    const customProviders = ['elevenlabs', 'azureTts', 'myshell'];
    
    if (customProviders.includes(providerInfo.provider)) {
        try {
            const client = createProviderClient(providerInfo.provider, providerInfo.apiKey);
            // For TTS, we would need to extract the text from the request
            // This is a simplified implementation
            const text = req.messages.map(msg => msg.content[0].text).join(' ');
            const response = await client.generateSpeech(text);
            
            // Return in Genkit-compatible format
            return {
                model: providerInfo.model,
                result: {
                    role: 'model' as const,
                    content: [{ text: `Speech generated: ${response.audioUrl}` }]
                }
            };
        } catch (error) {
            console.error(`Error generating TTS with ${providerInfo.provider}:`, error);
            throw error;
        }
    } else {
        // For providers with Genkit plugins, use Genkit
        const genkitInstance = createGenkitInstance({ [providerInfo.provider]: providerInfo.apiKey });
        return genkitInstance.generate({ ...req, model: providerInfo.model });
    }
}
