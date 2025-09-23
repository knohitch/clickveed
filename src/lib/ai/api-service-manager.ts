

'use server';

/**
 * @fileOverview Manages and rotates through available AI service providers.
 * This file centralizes the logic for selecting an provider based on
 * configured API keys, ensuring features degrade gracefully if a key is missing.
 */
import { ai } from '@/ai/genkit';
import { type Tool } from 'genkit';
import { googleAI, type GoogleAIPlugin } from '@genkit-ai/googleai';
import { z } from 'zod';
import { searchPexelsTool } from '@/server/ai/tools/pexels-tool';
import { searchPixabayTool } from '@/server/ai/tools/pixabay-tool';
import { getUnsplashRandomPhoto } from '@/server/ai/tools/unsplash-tool';
import { getAdminSettings } from '@/server/actions/admin-actions';
import { initialApiKeysObject } from '@/contexts/admin-settings-context';

// Define request types locally as they are no longer exported from genkit
type MessageRole = 'user' | 'model' | 'system' | 'tool';

interface Message {
  role: MessageRole;
  content: Array<{ text: string }>;
}

interface GenerateRequest {
  model: string;
  messages: Message[];
  config?: any;
}

interface GenerateStreamRequest extends GenerateRequest {}

type ProviderName = keyof typeof initialApiKeysObject;

interface ProviderConfig {
    name: ProviderName;
    model: string; // Changed from ModelReference<any> to string
}

const llmProviderPriority: ProviderConfig[] = [
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

// This function now returns a reference to the pre-initialized model,
// ensuring we don't create new plugin instances on every call.
async function getAvailableProvider(priorityList: ProviderConfig[], type: string) {
    const { apiKeys } = await getAdminSettings();
    
    for (const provider of priorityList) {
        const apiKey = apiKeys[provider.name as keyof typeof apiKeys];
        
        if (apiKey) {
            // Return the model string for now - the AI flows will handle the model resolution
            return provider.model;
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

// These functions will now use the globally configured `ai` instance
// with the dynamically selected model.
export async function generateWithProvider(req: Omit<GenerateRequest, 'model'>) {
    const model = await getAvailableTextGenerator();
    return ai.generate({ ...req, model });
}

export async function generateStreamWithProvider(req: Omit<GenerateStreamRequest, 'model'>) {
    const model = await getAvailableTextGenerator();
    return ai.generateStream({ ...req, model });
}

export async function generateImageWithProvider(req: Omit<GenerateRequest, 'model'>) {
    const model = await getAvailableImageGenerator();
    return ai.generate({ ...req, model });
}

export async function generateVideoWithProvider(req: Omit<GenerateRequest, 'model'>) {
    const model = await getAvailableVideoGenerator();
    return ai.generate({ ...req, model });
}

export async function generateTtsWithProvider(req: Omit<GenerateRequest, 'model'>) {
    const model = await getAvailableTTSProvider();
    return ai.generate({ ...req, model });
}
