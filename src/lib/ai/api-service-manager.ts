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

const llmProviderPriority: ProviderConfig[] = [
    { name: 'openai', model: 'openai/gpt-4o' },
    { name: 'gemini', model: 'googleai/gemini-1.5-flash' },
];

const imageProviderPriority: ProviderConfig[] = [
    { name: 'gemini', model: 'googleai/gemini-1.5-flash' },
];

const videoProviderPriority: ProviderConfig[] = [
    { name: 'googleVeo', model: 'googleai/veo-2.0-generate-001' },
];

const ttsProviderPriority: ProviderConfig[] = [
    { name: 'gemini', model: 'googleai/gemini-1.5-flash-tts' as any },
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
    
    if (providerInfo.provider === 'openai') {
        // Use OpenAI directly via the client
        const openaiClient = getOpenAIClient(providerInfo.apiKey);
        
        const { messages, ...rest } = req;
        
        // Convert Genkit message format to OpenAI format
        const openaiMessages = messages.map(msg => {
            // Handle different role types correctly for OpenAI
            const role = msg.role === 'model' ? 'assistant' : msg.role;
            // Ensure role is a valid OpenAI chat role
            return {
                role: role as OpenAI.ChatCompletionMessageParam["role"],
                content: msg.content[0].text
            };
        });
        
        // Call OpenAI API
        const response = await openaiClient.chat.completions.create({
            model: 'gpt-4o', // Use appropriate model
            messages: openaiMessages as OpenAI.ChatCompletionMessageParam[],
            ...rest
        });
        
        // Return in Genkit-compatible format
        return {
            model: providerInfo.model,
            result: {
                role: 'model' as const,
                content: [{ text: response.choices[0].message.content || '' }]
            }
        };
    } else {
        // For other providers like Google AI, use Genkit
        const genkitInstance = createGenkitInstance({ [providerInfo.provider]: providerInfo.apiKey });
        return genkitInstance.generate({ ...req, model: providerInfo.model });
    }
}

export async function generateStreamWithProvider(req: Omit<GenerateStreamRequest, 'model'>) {
    const providerInfo = await getAvailableTextGenerator();
    
    if (providerInfo.provider === 'openai') {
        // Use OpenAI directly via the client for streaming
        const openaiClient = getOpenAIClient(providerInfo.apiKey);
        
        const { messages, ...rest } = req;
        
        // Convert Genkit message format to OpenAI format
        const openaiMessages = messages.map(msg => {
            // Handle different role types correctly for OpenAI
            const role = msg.role === 'model' ? 'assistant' : msg.role;
            // Ensure role is a valid OpenAI chat role
            return {
                role: role as OpenAI.ChatCompletionMessageParam["role"],
                content: msg.content[0].text
            };
        });
        
        try {
            // Call OpenAI API with streaming
            const stream = await openaiClient.chat.completions.create({
                model: 'gpt-4o', // Use appropriate model
                messages: openaiMessages as OpenAI.ChatCompletionMessageParam[],
                stream: true,
                ...rest
            });
            
            // Create a Genkit-compatible response
            const streamIterator = (async function* () {
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        yield {
                            role: 'model' as const,
                            content: [{ text: content }]
                        };
                    }
                }
            })();
            
            return {
                stream: streamIterator,
                response: Promise.resolve(null)
            };
        } catch (error) {
            console.error("Error streaming from OpenAI:", error);
            throw error;
        }
    } else {
        // For other providers like Google AI, use Genkit
        const genkitInstance = createGenkitInstance({ [providerInfo.provider]: providerInfo.apiKey });
        return genkitInstance.generateStream({ ...req, model: providerInfo.model });
    }
}

export async function generateImageWithProvider(req: Omit<GenerateRequest, 'model'>) {
    const providerInfo = await getAvailableImageGenerator();
    // Pass just the model string, not the provider info object
    return ai.generate({ ...req, model: providerInfo.model });
}

export async function generateVideoWithProvider(req: Omit<GenerateRequest, 'model'>) {
    const providerInfo = await getAvailableVideoGenerator();
    // Pass just the model string, not the provider info object
    return ai.generate({ ...req, model: providerInfo.model });
}

export async function generateTtsWithProvider(req: Omit<GenerateRequest, 'model'>) {
    const providerInfo = await getAvailableTTSProvider();
    // Pass just the model string, not the provider info object
    return ai.generate({ ...req, model: providerInfo.model });
}
