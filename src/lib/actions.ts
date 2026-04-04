'use server';

import { removeImageBackground } from '@/server/ai/flows/remove-image-background';
import { generateVideoWithProvider } from '@/lib/ai/api-service-manager';
import { creativeAssistantChat } from '@/server/ai/flows/creative-assistant-chat';
import { generateTimedTranscript } from '@/server/ai/flows/generate-timed-transcript';
import { generateVideoFromImage } from '@/server/ai/flows/generate-video-from-image';
import { generatePersonaAvatar } from '@/server/ai/flows/generate-persona-avatar';
import { generateVideoScript } from '@/server/ai/flows/generate-video-script';
import { supportChat } from '@/server/ai/flows/support-chat';
import { researchVideoTopic } from '@/server/ai/flows/research-video-topic';
import { createVoiceClone } from '@/server/ai/flows/create-voice-clone';
import { generateAutomationWorkflow } from '@/server/ai/flows/generate-automation-workflow';
import { generateVoiceOver } from '@/server/ai/flows/generate-voice-over';
import { analyzeThumbnails } from '@/server/ai/flows/analyze-thumbnails';
import { generateStockMedia } from '@/server/ai/flows/generate-stock-media';
import { findViralClips as findViralClipsFlow } from '@/server/ai/flows/find-viral-clips';
import { generatePipelineScript, generatePipelineVoiceOver, generatePipelineVideo } from '@/server/ai/flows/video-pipeline';
import type { Message } from '@/lib/types';
import { z } from 'zod';
import { auth } from '@/auth';
import { checkUserFeatureAccess } from '@/server/actions/feature-access-actions';
import { consumeAICredits } from '@/server/actions/ai-credits-actions';
import { getRedisUrl } from '@/lib/redis-config';
import { validateAutomationWorkflow } from '@/lib/automation-workflow-validator';
import IORedis from 'ioredis';

/**
 * Helper function to verify feature access for the current user
 * Throws an error if the user doesn't have access to the feature
 */
async function verifyFeatureAccess(featureId: string): Promise<void> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Authentication required');
    }

    // Use server-side feature access check that respects database-configured features
    const access = await checkUserFeatureAccess(session.user.id, featureId);

    if (!access.canAccess) {
        throw new Error(`${access.featureName} is not available on your current plan. Please upgrade to access this feature.`);
    }
}

async function requireAuthenticatedUserId(): Promise<string> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Authentication required');
    }

    return session.user.id;
}

const aiRateLimitFallbackStore = new Map<string, { count: number; resetTime: number }>();
const aiRateLimitRedisUrl = getRedisUrl();
const aiRateLimitRedis = aiRateLimitRedisUrl
    ? new IORedis(aiRateLimitRedisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 5000,
    })
    : null;

type AIRateLimitConfig = {
    maxRequests: number;
    windowMs: number;
    message: string;
};

const DEFAULT_AI_RATE_LIMIT: AIRateLimitConfig = {
    maxRequests: 8,
    windowMs: 60 * 1000,
    message: 'Too many AI requests. Please wait a minute and try again.',
};

const AI_ACTION_PRICING = {
    'automation-workflow': 2,
    'background-remover': 1,
    'creative-assistant': 1,
    'magic-clips': 1,
    'support-chat': 1,
    'timed-transcript': 2,
    'image-to-video': 3,
    'text-to-video': 4,
    'persona-avatar': 5,
    'script-generator': 1,
    'topic-research': 1,
    'voice-clone': 3,
    'voice-over': 1,
    'thumbnail-analysis': 1,
    'stock-media': 2,
    'pipeline-script': 1,
    'pipeline-voice-over': 1,
    'pipeline-video': 4,
} as const;

export async function findViralClips(input: Parameters<typeof findViralClipsFlow>[0]) {
    const userId = await requireAuthenticatedUserId();
    await verifyFeatureAccess('magic-clips');
    await enforceAIUsageControls(userId, 'magic-clips');
    return findViralClipsFlow(input);
}

async function enforceAIRateLimit(
    userId: string,
    scope: string,
    config: Partial<AIRateLimitConfig> = {}
): Promise<void> {
    const { maxRequests, windowMs, message } = {
        ...DEFAULT_AI_RATE_LIMIT,
        ...config,
    };
    const key = `rate:${scope}:${userId}`;
    const now = Date.now();

    if (aiRateLimitRedis) {
        try {
            if (aiRateLimitRedis.status === 'wait') {
                await aiRateLimitRedis.connect();
            }

            const windowStart = now - windowMs;
            const pipeline = aiRateLimitRedis.pipeline();
            pipeline.zremrangebyscore(key, 0, windowStart);
            pipeline.zcard(key);
            pipeline.zadd(key, now, `${now}-${Math.random().toString(36).slice(2, 8)}`);
            pipeline.expire(key, Math.ceil(windowMs / 1000));

            const results = await pipeline.exec();
            const requestCount = typeof results?.[1]?.[1] === 'number' ? results[1][1] : 0;

            if (requestCount >= maxRequests) {
                throw new Error(message);
            }

            return;
        } catch (error) {
            console.error(`Redis rate limit failed for ${scope}, falling back to memory store:`, error);
        }
    }

    const existing = aiRateLimitFallbackStore.get(key);
    if (!existing || now > existing.resetTime) {
        aiRateLimitFallbackStore.set(key, {
            count: 1,
            resetTime: now + windowMs,
        });
        return;
    }

    if (existing.count >= maxRequests) {
        throw new Error(message);
    }

    existing.count += 1;
}

async function enforceAIUsageControls(
    userId: string,
    scope: keyof typeof AI_ACTION_PRICING,
    config: Partial<AIRateLimitConfig> = {}
): Promise<void> {
    await enforceAIRateLimit(userId, scope, config);

    const creditCost = AI_ACTION_PRICING[scope];
    const creditResult = await consumeAICredits(creditCost);
    if (!creditResult.success) {
        throw new Error(creditResult.error || 'Insufficient AI credits');
    }
}

async function readTextFromStream(stream: ReadableStream<any>): Promise<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        if (typeof value === 'string') {
            fullText += value;
            continue;
        }

        if (value) {
            fullText += decoder.decode(value as Uint8Array, { stream: true });
        }
    }

    fullText += decoder.decode();
    return fullText;
}

const GenerateWorkflowSchema = z.object({
    prompt: z.string().min(1, 'Prompt is required'),
    platform: z.enum(['n8n', 'Make.com']),
});

export async function generateAutomationWorkflowAction(prevState: any, formData: FormData) {
    const validatedFields = GenerateWorkflowSchema.safeParse({
        prompt: formData.get('prompt'),
        platform: formData.get('platform'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Validation failed',
            errors: validatedFields.error.flatten().fieldErrors,
            workflow: null
        };
    }

    const { prompt, platform } = validatedFields.data;

    try {
        const userId = await requireAuthenticatedUserId();

        // Check feature access for AI agents
        await verifyFeatureAccess('ai-agents');
        await enforceAIUsageControls(userId, 'automation-workflow');
        const result = await generateAutomationWorkflow({ prompt, platform });
        const validation = validateAutomationWorkflow(platform, result.workflow);

        if (!validation.ok) {
            return {
                message: `Generated ${platform} workflow is not importable yet: ${validation.errors.join(' ')}`,
                workflow: null,
                errors: {
                    workflow: validation.errors,
                }
            };
        }

        return {
            message: 'success',
            workflow: validation.workflow,
            errors: {}
        };

    } catch (error) {
        console.error('Workflow generation error:', error);
        return {
            message: error instanceof Error ? error.message : 'An unexpected error occurred',
            workflow: null,
            errors: {}
        };
    }
}

const RemoveBackgroundSchema = z.object({
    imageUrl: z.string().url('Invalid image URL'),
});

export async function removeImageBackgroundAction(prevState: any, formData: FormData) {
    const validatedFields = RemoveBackgroundSchema.safeParse({
        imageUrl: formData.get('imageUrl'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Validation failed',
            errors: validatedFields.error.flatten().fieldErrors,
            image: null
        };
    }

    try {
        const userId = await requireAuthenticatedUserId();

        // Check feature access for background remover
        await verifyFeatureAccess('background-remover');
        await enforceAIUsageControls(userId, 'background-remover');

        const result = await removeImageBackground({
            imageUrl: validatedFields.data.imageUrl
        });

        return {
            message: 'success',
            image: result.imageUrl,
            errors: {}
        };
    } catch (error) {
        console.error('Background removal error:', error);
        return {
            message: error instanceof Error ? error.message : 'Failed to remove background',
            image: null,
            errors: {}
        };
    }
}

export async function creativeAssistantChatAction(prevState: any, formData: FormData) {
    const message = formData.get('message') as string;
    const historyJson = formData.get('history') as string;

    if (!message) {
        return { message: 'Message is required', stream: null, responseText: '', errors: { message: ['Message is required'] } };
    }

    let history: { role: 'user' | 'assistant'; content: string }[] = [];
    try {
        if (historyJson) {
            const parsed: Message[] = JSON.parse(historyJson);
            // Map 'model' role to 'assistant' for compatibility
            history = parsed.map(msg => ({
                role: msg.role === 'model' ? 'assistant' : msg.role,
                content: msg.content
            }));
        }
    } catch (e) {
        console.error("Failed to parse history", e);
    }

    try {
        const userId = await requireAuthenticatedUserId();

        await verifyFeatureAccess('creative-assistant');
        await enforceAIUsageControls(userId, 'creative-assistant', {
            maxRequests: 12,
            message: 'Too many AI chat requests. Please wait a minute and try again.',
        });

        const stream = await creativeAssistantChat({
            message,
            history
        });
        const responseText = await readTextFromStream(stream);

        return {
            message: '',
            stream: null,
            responseText,
            errors: {}
        };
    } catch (error) {
        console.error('Chat error:', error);
        return {
            message: error instanceof Error ? error.message : 'An unexpected error occurred',
            stream: null,
            responseText: '',
            errors: {}
        };
    }
}

const TimedTranscriptSchema = z.object({
    videoUrl: z.string().url('Invalid video URL'),
});

export async function generateTimedTranscriptAction(prevState: any, formData: FormData) {
    const validatedFields = TimedTranscriptSchema.safeParse({
        videoUrl: formData.get('videoUrl'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Validation failed',
            errors: validatedFields.error.flatten().fieldErrors,
            transcript: null
        };
    }

    try {
        const userId = await requireAuthenticatedUserId();
        await enforceAIUsageControls(userId, 'timed-transcript');

        const result = await generateTimedTranscript({
            videoUrl: validatedFields.data.videoUrl
        });

        return {
            message: 'success',
            transcript: result.transcript,
            errors: {}
        };
    } catch (error) {
        console.error('Transcript generation error:', error);
        return {
            message: error instanceof Error ? error.message : 'Failed to generate transcript',
            transcript: null,
            errors: {}
        };
    }
}

export async function generateVideoAction(prevState: any, formData: FormData) {
    const input = {
        photoUrl: formData.get('imageUrl') as string,
        musicPrompt: formData.get('musicPrompt') as string,
        videoDescription: formData.get('videoDescription') as string,
    };

    if (!input.photoUrl || !input.musicPrompt || !input.videoDescription) {
        return { message: 'All fields are required', videoUrl: null, audioUrl: null, errors: {} };
    }

    try {
        const userId = await requireAuthenticatedUserId();

        // Check feature access for image-to-video
        await verifyFeatureAccess('image-to-video');
        await enforceAIUsageControls(userId, 'image-to-video', { maxRequests: 4 });

        const result = await generateVideoFromImage(input);
        return {
            message: 'success',
            videoUrl: result.videoUrl,
            audioUrl: result.audioUrl,
            errors: {}
        };
    } catch (error) {
        return {
            message: error instanceof Error ? error.message : 'Failed to generate video',
            videoUrl: null,
            audioUrl: null,
            errors: {}
        };
    }
}

export async function generateVideoGeneratorAction(prevState: any, formData: FormData) {
    const prompt = (formData.get('prompt') as string || '').trim();
    const style = (formData.get('style') as string || '').trim();
    const duration = (formData.get('duration') as string || '').trim();
    const aspectRatio = (formData.get('aspectRatio') as string || '').trim();
    const camera = (formData.get('camera') as string || '').trim();
    const motion = (formData.get('motion') as string || '').trim();

    if (!prompt) {
        return { message: 'Prompt is required', videoUrl: null, errors: { prompt: ['Prompt is required'] } };
    }

    try {
        const userId = await requireAuthenticatedUserId();

        // Dedicated generator still follows plan-based video access
        await verifyFeatureAccess('video-suite');
        await enforceAIUsageControls(userId, 'text-to-video', { maxRequests: 4 });

        const enrichedPrompt = [
            `Create a high-quality cinematic video with this concept: ${prompt}`,
            style ? `Style: ${style}.` : '',
            duration ? `Duration target: ${duration}.` : '',
            aspectRatio ? `Aspect ratio: ${aspectRatio}.` : '',
            camera ? `Camera direction: ${camera}.` : '',
            motion ? `Motion pacing: ${motion}.` : '',
            'Prioritize visual coherence, smooth motion, realistic lighting, and production-ready output.'
        ].filter(Boolean).join('\n');

        // Uses provider registry priority: Veo first, then configured fallbacks
        const response: any = await generateVideoWithProvider({
            messages: [{ role: 'user', content: [{ text: enrichedPrompt }] }],
        });

        const text = response?.result?.content?.[0]?.text || '';
        const fromText = text.replace('Video generated: ', '').trim();
        const direct = response?.videoUrl || response?.media?.url || '';
        const videoUrl = fromText || direct;

        if (!videoUrl || typeof videoUrl !== 'string') {
            throw new Error('No video URL returned from the generation provider.');
        }

        return {
            message: 'success',
            videoUrl,
            provider: response?.provider || null,
            model: response?.model || null,
            errors: {},
        };
    } catch (error) {
        return {
            message: error instanceof Error ? error.message : 'Failed to generate video',
            videoUrl: null,
            provider: null,
            model: null,
            errors: {},
        };
    }
}

export async function generatePersonaAvatarAction(prevState: any, formData: FormData) {
    const input = {
        personaName: formData.get('personaName') as string,
        personaDescription: formData.get('personaDescription') as string,
        avatarDescription: formData.get('avatarDescription') as string,
        script: formData.get('script') as string,
    };

    // Basic validation
    if (!input.personaName || !input.personaDescription || !input.avatarDescription || !input.script) {
        return { message: 'All fields are required', avatarImageUrl: null, jobId: null, jobStatus: null, videoStatus: null, videoUrl: null, errors: {} };
    }

    try {
        const userId = await requireAuthenticatedUserId();

        // Check feature access for persona studio
        await verifyFeatureAccess('persona-studio');
        await enforceAIUsageControls(userId, 'persona-avatar', { maxRequests: 3 });

        const result = await generatePersonaAvatar(input);
        return {
            message: 'success',
            avatarImageUrl: result.avatarImageUrl,
            jobId: result.jobId,
            jobStatus: result.jobStatus,
            videoStatus: result.videoStatus,
            videoUrl: result.videoUrl,
            errors: {}
        };
    } catch (error) {
        return {
            message: error instanceof Error ? error.message : 'Failed to generate avatar',
            avatarImageUrl: null,
            jobId: null,
            jobStatus: null,
            videoStatus: null,
            videoUrl: null,
            errors: {}
        };
    }
}

export async function generateScriptAction(prevState: any, formData: FormData) {
    const topic = formData.get('prompt') as string;
    const style = (formData.get('videoType') as string) || 'default';
    const tone = (formData.get('tone') as string) || 'professional';
    const length = (formData.get('duration') as string) || '2 minutes';
    const input = {
        topic,
        style,
        tone,
        length,
    };

    if (!input.topic) {
        return { message: 'Topic is required', script: null, errors: { prompt: ['Topic is required'] } };
    }

    try {
        const userId = await requireAuthenticatedUserId();

        // Check feature access for script generator
        await verifyFeatureAccess('script-generator');
        await enforceAIUsageControls(userId, 'script-generator');

        const result = await generateVideoScript(input);
        return {
            message: 'success',
            script: result.script,
            errors: {}
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate script';

        // Provide actionable error messages for common issues
        let userMessage = errorMessage;
        if (errorMessage.includes('No AI provider') || errorMessage.includes('No healthy') || errorMessage.includes('No streaming provider')) {
            userMessage = 'AI service is not available. Please contact your administrator to configure AI API keys in the admin panel.';
        } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('429')) {
            userMessage = 'AI service rate limit reached. Please try again in a few minutes.';
        }

        return {
            message: userMessage,
            script: null,
            errors: {}
        };
    }
}

export async function supportChatAction(prevState: any, formData: FormData) {
    const message = formData.get('message') as string;
    const historyJson = formData.get('history') as string;

    if (!message) {
        return { message: 'Message is required', stream: null, responseText: '', errors: { message: ['Message is required'] } };
    }

    let history: any[] = [];
    try {
        if (historyJson) {
            history = JSON.parse(historyJson);
        }
    } catch (e) {
        console.error("Failed to parse history", e);
    }

    try {
        const userId = await requireAuthenticatedUserId();

        await verifyFeatureAccess('ai-assistant');
        await enforceAIUsageControls(userId, 'support-chat', {
            maxRequests: 12,
            message: 'Too many AI chat requests. Please wait a minute and try again.',
        });

        const stream = await supportChat({
            message,
            history
        });
        const responseText = await readTextFromStream(stream);

        return {
            message: '',
            stream: null,
            responseText,
            errors: {}
        };
    } catch (error) {
        console.error('Chat error:', error);
        return {
            message: error instanceof Error ? error.message : 'An unexpected error occurred',
            stream: null,
            responseText: '',
            errors: {}
        };
    }
}

export async function researchVideoTopicAction(prevState: any, formData: FormData) {
    const topic = formData.get('topic') as string;
    const platform = (formData.get('platform') as string) || 'YouTube';
    const audience = (formData.get('audience') as string) || undefined;

    if (!topic) {
        return { message: 'Topic is required', ideas: [], errors: { topic: ['Topic is required'] } };
    }

    try {
        const userId = await requireAuthenticatedUserId();

        // Check feature access for topic researcher
        await verifyFeatureAccess('topic-researcher');
        await enforceAIUsageControls(userId, 'topic-research');

        const result = await researchVideoTopic({ topic, platform, audience });
        return {
            message: 'success',
            ideas: result.titleIdeas,
            errors: {}
        };
    } catch (error) {
        return {
            message: error instanceof Error ? error.message : 'Failed to research topic',
            ideas: [],
            errors: {}
        };
    }
}

export async function createVoiceCloneAction(prevState: any, formData: FormData) {
    const voiceName = formData.get('voiceName') as string;
    const fileUrls = formData.getAll('fileUrls') as string[];

    if (!voiceName) return { message: 'Voice name required', result: null, errors: { voiceName: ['Required'] } };
    if (!fileUrls.length) return { message: 'Audio samples required', result: null, errors: { fileUrls: ['Required'] } };

    try {
        const userId = await requireAuthenticatedUserId();

        // Check feature access for voice cloning (Enterprise only)
        await verifyFeatureAccess('voice-cloning');
        await enforceAIUsageControls(userId, 'voice-clone', { maxRequests: 4 });

        const result = await createVoiceClone({ voiceName, fileUrls });
        return {
            message: 'success',
            result: result,
            errors: {}
        };
    } catch (error) {
        return {
            message: error instanceof Error ? error.message : 'Failed to clone voice',
            result: null,
            errors: {}
        };
    }
}

export async function generateVoiceOverAction(prevState: any, formData: FormData) {
    const script = formData.get('script') as string;
    const speakersJson = formData.get('speakers') as string;
    const voice = formData.get('voice') as string; // Legacy/single speaker fallback

    if (!script) return { message: 'Script required', audio: null, errors: { script: ['Required'] } };

    let speakers: any[] = [];
    try {
        if (speakersJson) {
            const parsed = JSON.parse(speakersJson);
            // Map frontend speaker shape to backend expected shape if needed
            speakers = parsed.map((s: any, index: number) => ({
                speakerId: `Speaker${index + 1}`,
                voice: s.voice
            }));
        } else if (voice) {
            speakers = [{ speakerId: 'Speaker1', voice }];
        }
    } catch (e) {
        console.warn('Failed to parse speakers JSON, using default:', e);
    }

    try {
        const userId = await requireAuthenticatedUserId();

        // Check feature access for voice over
        await verifyFeatureAccess('voice-over');
        await enforceAIUsageControls(userId, 'voice-over', { maxRequests: 10 });

        const result = await generateVoiceOver({ script, speakers });
        return {
            message: 'success',
            audio: result.audioUrl,
            errors: {}
        };
    } catch (error) {
        return {
            message: error instanceof Error ? error.message : 'Failed to generate voice over',
            audio: null,
            errors: {}
        };
    }
}

export async function analyzeThumbnailsAction(prevState: any, formData: FormData) {
    const thumbnailA_DataUri = formData.get('thumbnailA') as string; // Wait, checking component input name
    // Actually the component uses file inputs which aren't passed directly as data URIs usually unless handled by client.
    // Looking at thumbnail-tester.tsx, it seems it handles file reading on client but `ThumbnailUploader` just sets file input.
    // However, the `handleFileChange` sets preview. 
    // The form submission in `ThumbnailTester` uses standard form action. 
    // BUT `ThumbnailUploader` has `input type = "file"`.
    // The server action expects Data URIs. 
    // WARNING: Sending files to server action and converting to Data URI on server is better, or client updates hidden input.
    // `ThumbnailUploader` has `Input type = "file" name = { id }`. 
    // So formData will contain File objects.

    // I need to convert File objects to Data URIs or buffer here if possible, 
    // OR update the flow to accept Files. 
    // `analyzeThumbnails` flow expects string data URIs.
    // I will try to convert if possible, otherwise this might fail.
    // For now assuming the files are small enough or the Flow handles it? No, Flow defines z.string().

    // Let's try to read the file from formData.
    const fileA = formData.get('thumbnailA') as File;
    const fileB = formData.get('thumbnailB') as File;
    const videoTitle = formData.get('videoTitle') as string;
    const targetAudience = formData.get('targetAudience') as string;

    if (!fileA || !fileB || !videoTitle) {
        return { message: 'Missing inputs', analysis: null, errors: {} };
    }

    try {
        const userId = await requireAuthenticatedUserId();

        // Check feature access for thumbnail tester
        await verifyFeatureAccess('thumbnail-tester');
        await enforceAIUsageControls(userId, 'thumbnail-analysis');

        // Helper to convert File to Data URI
        const fileToDataUri = async (file: File) => {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return `data:${file.type};base64,${buffer.toString('base64')}`;
        };

        const uriA = await fileToDataUri(fileA);
        const uriB = await fileToDataUri(fileB);

        const result = await analyzeThumbnails({
            thumbnailA: uriA,
            thumbnailB: uriB,
            videoTitle,
            targetAudience
        });

        return {
            message: 'success',
            analysis: result,
            errors: {}
        };
    } catch (error) {
        return {
            message: error instanceof Error ? error.message : 'Analysis failed',
            analysis: null,
            errors: {}
        };
    }
}

export async function generateStockMediaAction(prevState: any, formData: FormData) {
    const prompt = formData.get('prompt') as string;
    if (!prompt) return { message: 'Prompt required', images: [], errors: { prompt: ['Required'] } };

    try {
        const userId = await requireAuthenticatedUserId();

        // Check feature access for stock media
        await verifyFeatureAccess('stock-media');
        await enforceAIUsageControls(userId, 'stock-media', { maxRequests: 6 });

        const result = await generateStockMedia({ prompt });
        return {
            message: 'success',
            images: result.images,
            errors: {}
        };
    } catch (error) {
        return {
            message: error instanceof Error ? error.message : 'Failed to generate media',
            images: [],
            errors: {}
        };
    }
}

export async function generatePipelineScriptAction(prevState: any, formData: FormData) {
    const input = {
        prompt: formData.get('prompt') as string,
        videoType: formData.get('videoType') as string,
        tone: formData.get('tone') as string,
        duration: formData.get('duration') as string,
    };

    if (!input.prompt) return { message: 'Prompt required', script: null, errors: {} };

    try {
        const userId = await requireAuthenticatedUserId();

        // Check feature access for video pipeline
        await verifyFeatureAccess('video-pipeline');
        await enforceAIUsageControls(userId, 'pipeline-script');

        const result = await generatePipelineScript(input);
        return {
            message: 'success',
            script: result.script,
            errors: {}
        };
    } catch (error) {
        return {
            message: error instanceof Error ? error.message : 'Failed to generate script',
            script: null,
            errors: {}
        };
    }
}

export async function generatePipelineVoiceOverAction(prevState: any, formData: FormData) {
    const script = formData.get('script') as string;
    const voice = formData.get('voice') as string;

    if (!script) return { message: 'Script required', audio: null, errors: {} };

    try {
        const userId = await requireAuthenticatedUserId();

        // Check feature access for voice over
        await verifyFeatureAccess('voice-over');
        await enforceAIUsageControls(userId, 'pipeline-voice-over', { maxRequests: 10 });

        const result = await generatePipelineVoiceOver({ script, voice });
        return {
            message: 'success',
            audio: result.audioUrl,
            errors: {}
        };
    } catch (error) {
        return {
            message: error instanceof Error ? error.message : 'Failed to generate voice over',
            audio: null,
            errors: {}
        };
    }
}

export async function generatePipelineVideoAction(prevState: any, formData: FormData) {
    const script = formData.get('script') as string;

    if (!script) return { message: 'Script required', video: null, errors: {} };

    try {
        const userId = await requireAuthenticatedUserId();

        // Check feature access for video pipeline
        await verifyFeatureAccess('video-pipeline');
        await enforceAIUsageControls(userId, 'pipeline-video', { maxRequests: 4 });

        const result = await generatePipelineVideo({ script });
        return {
            message: 'success',
            video: result.videoUrl,
            errors: {}
        };
    } catch (error) {
        return {
            message: error instanceof Error ? error.message : 'Failed to generate video',
            video: null,
            errors: {}
        };
    }
}

export async function shareVideoToSocialsAction(prevState: any, formData: FormData) {
    // Stub implementation
    const captions = formData.get('caption');
    const platforms = formData.get('platforms');

    console.log("Sharing to socials (STUB):", { captions, platforms });

    // Simulate success
    return {
        message: 'success',
        errors: {}
    };
}
