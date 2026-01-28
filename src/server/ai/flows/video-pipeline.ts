'use server';
/**
 * @fileOverview A collection of AI functions to power the multi-step video creation pipeline.
 * Each function represents a distinct step in the workflow.
 */

import { ai } from '@/ai/genkit';
import wav from 'wav';
import { getAvailableTTSProvider, getAvailableVideoGenerator, generateStructuredOutput } from '@/lib/ai/api-service-manager';
import { uploadToWasabi } from '@/server/services/wasabi-service';
import prisma from '@/server/prisma';
import { auth } from '@/auth';
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

    let bufs = [] as any[];
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

  // We extract only the spoken parts from the script for the TTS model.
  const voiceOverText = input.script.match(/Voiceover:|VO:|Narrator:|Dialogue:/g)
    ? input.script.split(/Voiceover:|VO:|Narrator:|Dialogue:/).slice(1).join(' ').replace(/\[.*?\]/g, '')
    : input.script; // Fallback to using the whole script if no cues are found.

  // Get the provider info and extract just the model string
  const providerInfo = await getAvailableTTSProvider();

  const { media } = await ai.generate({
    prompt: voiceOverText,
    model: providerInfo.model, // Use just the model string, not the full provider info
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: input.voice },
        },
      }
    }
  });

  if (!media) {
    throw new Error('Audio generation failed. No media was returned.');
  }

  const audioPcmBuffer = Buffer.from(
    media.url.substring(media.url.indexOf(',') + 1),
    'base64'
  );

  const audioDataUri = 'data:audio/wav;base64,' + (await toWav(audioPcmBuffer));

  // Sequential upload and DB write to prevent orphaned files
  const { publicUrl, sizeMB } = await uploadToWasabi(audioDataUri, 'audio');

  // Extract the original prompt from the script for better naming
  const originalPromptMatch = input.script.match(/Core Idea: (.*?)\n/);
  const assetName = originalPromptMatch ? originalPromptMatch[1] : `Pipeline Voice Over: ${input.script.substring(0, 30)}...`;

  await prisma.mediaAsset.create({
    data: {
      name: assetName,
      type: 'AUDIO',
      url: publicUrl,
      size: sizeMB,
      userId: session.user.id,
    }
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

    // Extract scene descriptions from the script to create a visual prompt
    const sceneDescriptions = input.script.match(/\[SCENE:.*?\]/g) || [];
    const visualPrompt = sceneDescriptions.length > 0
      ? sceneDescriptions.join(' ').replace(/\[SCENE:/g, '').replace(/\]/g, '')
      : input.script.substring(0, 200); // Fallback to first 200 characters

    // Generate an image from the visual prompt using the image generation service
    const { getAvailableImageGenerator } = await import('@/lib/ai/api-service-manager');
    const imageProvider = await getAvailableImageGenerator();

    const { ai: genkitAi } = await import('@/ai/genkit');
    const imageResponse = await genkitAi.generate({
      model: imageProvider.model,
      prompt: visualPrompt.substring(0, 500), // Limit prompt length
      config: {
        responseModalities: ['IMAGE']
      }
    });

    if (!imageResponse.media) {
      throw new Error('Image generation failed for video pipeline scene.');
    }

    const placeholderImageUrl = imageResponse.media.url;


    // Import the video generation function
    const { generateVideoFromImage } = await import('./generate-video-from-image');

    try {
      // Generate video using the real video generation API
      const result = await generateVideoFromImage({
        photoUrl: placeholderImageUrl,
        musicPrompt: "Energetic background music",
        videoDescription: visualPrompt
      });

      return {
        videoUrl: result.videoUrl,
      };
    } catch (error) {
      console.error("Video generation failed:", error);
      throw new Error(`Failed to generate video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Pipeline video generation failed:', error);
    throw new Error(`Pipeline video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
