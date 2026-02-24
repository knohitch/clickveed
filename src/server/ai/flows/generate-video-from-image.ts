'use server';
/**
 * @fileOverview An AI agent that generates a video and a separate audio track from a single image.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { generateStructuredOutput, generateTtsWithProvider, generateVideoWithProvider } from '@/lib/ai/api-service-manager';
import prisma from '@/server/prisma';
import { auth } from '@/auth';
import {
  GenerateVideoFromImageInputSchema,
  GenerateVideoFromImageOutputSchema,
  type GenerateVideoFromImageInput,
  type GenerateVideoFromImageOutput,
} from './types';

// Re-export types for consumers
export type { GenerateVideoFromImageInput, GenerateVideoFromImageOutput } from './types';

export async function generateVideoFromImage(input: GenerateVideoFromImageInput): Promise<GenerateVideoFromImageOutput> {
  try {
    return await generateVideoFromImageFlow(input);
  } catch (error) {
    console.error('Video from image generation failed:', error);
    throw new Error(`Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

const generateVideoScriptPrompt = ai.definePrompt({
  name: 'generateVideoScriptPrompt',
  input: { schema: z.object({ videoDescription: z.string() }) },
  output: { schema: z.object({ voiceoverScript: z.string().describe("A concise voiceover script (1-2 sentences) that describes the scene or adds a call-to-action.") }) },
  prompt: `You are an expert video creator. Create a very short, compelling voiceover script (1-2 sentences) for a video based on the following description.

Video Description: {{{videoDescription}}}

Respond ONLY with the JSON object containing the voiceoverScript.
`,
});

const generateVideoFromImageFlow = ai.defineFlow(
  {
    name: 'generateVideoFromImageFlow',
    inputSchema: GenerateVideoFromImageInputSchema,
    outputSchema: GenerateVideoFromImageOutputSchema,
  },
  async input => {
    const session = await auth();

    if (!session?.user) {
      throw new Error("User must be authenticated to generate media.");
    }

    // Step 1: Generate voiceover script using text provider router
    const scriptResult = await generateStructuredOutput(
      `You are an expert video creator. Create a very short, compelling voiceover script (1-2 sentences) for a video based on this description.
Video Description: ${input.videoDescription}`,
      z.object({ voiceoverScript: z.string() })
    );
    const voiceoverScript = scriptResult.output?.voiceoverScript;
    if (!voiceoverScript) {
      throw new Error('Failed to generate voiceover script.');
    }

    // Step 2: Generate Video and Audio in parallel via capability router
    const [videoResponse, ttsResponse] = await Promise.all([
      generateVideoWithProvider({
        messages: [{ role: 'user', content: [{ text: `${input.videoDescription}\nImage: ${input.photoUrl}` }] }],
      }),
      generateTtsWithProvider({
        messages: [{ role: 'user', content: [{ text: voiceoverScript }] }],
      }),
    ]);

    const videoText = (videoResponse as any)?.result?.content?.[0]?.text || '';
    const videoUrl = videoText.replace('Video generated: ', '').trim();
    if (!videoUrl) {
      throw new Error('Video generation failed. No video URL was returned.');
    }

    await prisma.mediaAsset.create({
      data: { name: `Video: ${input.videoDescription.substring(0, 30)}...`, type: 'VIDEO', url: videoUrl, size: 0, userId: session.user.id }
    });

    const audioText = (ttsResponse as any)?.result?.content?.[0]?.text || '';
    const audioUrl = audioText.replace('Speech generated: ', '').trim() || (ttsResponse as any)?.audioUrl || '';
    if (!audioUrl) {
      throw new Error('Audio generation failed. No audio URL was returned.');
    }

    await prisma.mediaAsset.create({
      data: { name: `Audio: ${input.musicPrompt.substring(0, 30)}...`, type: 'AUDIO', url: audioUrl, size: 0, userId: session.user.id }
    });


    return {
      videoUrl,
      audioUrl,
    };
  }
);
