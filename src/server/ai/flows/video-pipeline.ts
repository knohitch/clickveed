'use server';
/**
 * @fileOverview A collection of AI functions to power the multi-step video creation pipeline.
 * Each function represents a distinct step in the workflow.
 */

import { ai } from '@/ai/genkit';
import wav from 'wav';
import { generateTtsWithProvider, generateStructuredOutput, generateImageWithProvider, generateVideoWithProvider } from '@/lib/ai/api-service-manager';
import { uploadToWasabi } from '@/server/services/wasabi-service';
import prisma from '@/server/prisma';
import { auth } from '@/auth';
import { buildPipelineVisualPrompt, extractPipelineVoiceOverText } from '@/server/ai/workflow-contract-helpers';
import {
  GeneratePipelineScriptInputSchema,
  GeneratePipelineScriptOutputSchema,
  GeneratePipelineVoiceOverInputSchema,
  GeneratePipelineVoiceOverOutputSchema,
  GeneratePipelineVideoInputSchema,
  GeneratePipelineVideoOutputSchema,
  type GeneratePipelineScriptInput,
  type GeneratePipelineScriptOutput,
  type GeneratePipelineVoiceOverInput,
  type GeneratePipelineVoiceOverOutput,
  type GeneratePipelineVideoInput,
  type GeneratePipelineVideoOutput,
} from './types';

// Re-export types for consumers
export type {
  GeneratePipelineScriptInput,
  GeneratePipelineScriptOutput,
  GeneratePipelineVoiceOverInput,
  GeneratePipelineVoiceOverOutput,
  GeneratePipelineVideoInput,
  GeneratePipelineVideoOutput,
} from './types';

// STEP 1: SCRIPT GENERATION =================================================

export async function generatePipelineScript(input: GeneratePipelineScriptInput): Promise<GeneratePipelineScriptOutput> {
  console.log('[generatePipelineScript] Starting script generation...');

  const prompt = `You are an expert AI video scriptwriter. Your task is to generate a compelling and well-structured video script based on the user's requirements.

  Pay close attention to all the details provided:

  - **Core Idea:** ${input.prompt}
  - **Video Type:** ${input.videoType}
  - **Desired Tone:** ${input.tone}
  - **Target Duration:** ${input.duration}

  Based on this, create a complete script. The script should include scene descriptions (like "[SCENE: A programmer's desk with code on screen]"), dialogue/voiceover, and camera/action cues where appropriate. Ensure the final script is plausible for the specified duration.
  
  Respond with a JSON object like: {"script": "Your complete script here..."}`;

  const result = await generateStructuredOutput(prompt, GeneratePipelineScriptOutputSchema);
  console.log('[generatePipelineScript] Using provider:', result.provider, 'model:', result.model);

  if (!result.output?.script) {
    throw new Error("The AI failed to generate a script based on the provided inputs.");
  }
  return result.output;
}


// STEP 2: VOICE OVER GENERATION ===============================================

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

export async function generatePipelineVoiceOver(input: GeneratePipelineVoiceOverInput): Promise<GeneratePipelineVoiceOverOutput> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("User must be authenticated to generate audio.");
  }

  return runPipelineVoiceOverWorkflow(input, {
    userId: session.user.id,
    generateTts: async (voiceOverText, voiceId) =>
      generateTtsWithProvider({
        messages: [{ role: 'user' as const, content: [{ text: voiceOverText }] }],
        voiceId,
      }),
    uploadAudio: async (mediaSource) => uploadToWasabi(mediaSource, 'audio'),
    createMediaAsset: async (asset) => prisma.mediaAsset.create({ data: asset }),
  });
}

export async function runPipelineVoiceOverWorkflow(
  input: GeneratePipelineVoiceOverInput,
  deps: {
    userId: string;
    generateTts: (voiceOverText: string, voiceId: string) => Promise<any>;
    uploadAudio: (mediaSource: string) => Promise<{ publicUrl: string; sizeMB: number }>;
    createMediaAsset: (asset: { name: string; type: 'AUDIO'; url: string; size: number; userId: string }) => Promise<unknown>;
  }
): Promise<GeneratePipelineVoiceOverOutput> {
  const voiceOverText = extractPipelineVoiceOverText(input.script);

  const ttsResponse: any = await deps.generateTts(voiceOverText, input.voice);

  const responseText = ttsResponse?.result?.content?.[0]?.text || '';
  let publicUrl = responseText.replace('Speech generated: ', '').trim() || ttsResponse?.audioUrl || '';
  let sizeMB = 0;
  let alreadyPersisted = false;

  if (!publicUrl && ttsResponse?.media?.url) {
    const audioPcmBuffer = Buffer.from(
      ttsResponse.media.url.substring(ttsResponse.media.url.indexOf(',') + 1),
      'base64'
    );
    const audioDataUri = 'data:audio/wav;base64,' + (await toWav(audioPcmBuffer));
    const uploadResult = await deps.uploadAudio(audioDataUri);
    publicUrl = uploadResult.publicUrl;
    sizeMB = uploadResult.sizeMB;
    alreadyPersisted = true;
  }

  if (!publicUrl) {
    throw new Error('Audio generation failed. No media was returned.');
  }

  // Persist provider-hosted audio URLs in our storage so media library links remain stable.
  if (!alreadyPersisted) {
    const persistedAudio = await deps.uploadAudio(publicUrl);
    publicUrl = persistedAudio.publicUrl;
    if (persistedAudio.sizeMB > 0) {
      sizeMB = persistedAudio.sizeMB;
    }
  }

  const originalPromptMatch = input.script.match(/Core Idea: (.*?)\n/);
  const assetName = originalPromptMatch ? originalPromptMatch[1] : `Pipeline Voice Over: ${input.script.substring(0, 30)}...`;

  await deps.createMediaAsset({
    name: assetName,
    type: 'AUDIO',
    url: publicUrl,
    size: sizeMB,
    userId: deps.userId,
  });

  return {
    audioUrl: publicUrl,
  };
}


// STEP 3: VIDEO GENERATION ==================================================

export async function generatePipelineVideo(input: GeneratePipelineVideoInput): Promise<GeneratePipelineVideoOutput> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("User must be authenticated to generate media.");
    }

    return runPipelineVideoWorkflow(input, {
      userId: session.user.id,
      generateImage: async (visualPrompt) =>
        generateImageWithProvider({
          messages: [{ role: 'user' as const, content: [{ text: visualPrompt.substring(0, 500) }] }],
        }),
      generateVideo: async (prompt) =>
        generateVideoWithProvider({
          messages: [{ role: 'user' as const, content: [{ text: prompt }] }],
        }),
      uploadVideo: async (mediaSource) => uploadToWasabi(mediaSource, 'videos'),
      createMediaAsset: async (asset) => prisma.mediaAsset.create({ data: asset }),
    });
  } catch (error) {
    console.error('Pipeline video generation failed:', error);
    throw new Error(`Pipeline video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function runPipelineVideoWorkflow(
  input: GeneratePipelineVideoInput,
  deps: {
    userId: string;
    generateImage: (visualPrompt: string) => Promise<any>;
    generateVideo: (prompt: string) => Promise<any>;
    uploadVideo: (mediaSource: string) => Promise<{ publicUrl: string; sizeMB: number }>;
    createMediaAsset: (asset: { name: string; type: 'VIDEO'; url: string; size: number; userId: string }) => Promise<unknown>;
  }
): Promise<GeneratePipelineVideoOutput> {
  const visualPrompt = buildPipelineVisualPrompt(input.script);

  const imageResponse: any = await deps.generateImage(visualPrompt);

  let placeholderImageUrl = '';
  const media = imageResponse?.media;
  if (typeof media?.url === 'string') {
    placeholderImageUrl = media.url;
  } else if (Array.isArray(media) && typeof media[0]?.url === 'string') {
    placeholderImageUrl = media[0].url;
  } else {
    const text = imageResponse?.result?.content?.[0]?.text || '';
    if (typeof text === 'string' && text.startsWith('Image generated: ')) {
      placeholderImageUrl = text.replace('Image generated: ', '').trim();
    }
  }

  if (!placeholderImageUrl) {
    throw new Error('Image generation failed for video pipeline scene.');
  }

  const videoResponse: any = await deps.generateVideo(`${visualPrompt}\nImage: ${placeholderImageUrl}`);

  const videoText = videoResponse?.result?.content?.[0]?.text || '';
  const providerVideoUrl = videoText.replace('Video generated: ', '').trim();
  if (!providerVideoUrl) {
    throw new Error('Video generation failed. No video URL was returned.');
  }
  const uploadedVideo = await deps.uploadVideo(providerVideoUrl);
  const videoUrl = uploadedVideo.publicUrl;

  await deps.createMediaAsset({
    name: `Pipeline Video: ${visualPrompt.substring(0, 30)}...`,
    type: 'VIDEO',
    url: videoUrl,
    size: uploadedVideo.sizeMB,
    userId: deps.userId,
  });

  return {
    videoUrl,
  };
}
