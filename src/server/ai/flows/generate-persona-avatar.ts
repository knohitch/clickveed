'use server';
/**
 * @fileOverview An AI agent that generates a talking avatar video based on a persona and script.
 */

import { ai } from '@/ai/genkit';
import { generateImageWithProvider, generateVideoWithProvider } from '@/lib/ai/api-service-manager';
import { uploadToWasabi } from '@/server/services/wasabi-service';
import prisma from '@/server/prisma';
import { auth } from '@/auth';
import {
  GeneratePersonaAvatarInputSchema,
  GeneratePersonaAvatarOutputSchema,
  type GeneratePersonaAvatarInput,
  type GeneratePersonaAvatarOutput,
} from './types';

// Re-export types for consumers
export type { GeneratePersonaAvatarInput, GeneratePersonaAvatarOutput } from './types';

export async function generatePersonaAvatar(
  input: GeneratePersonaAvatarInput
): Promise<GeneratePersonaAvatarOutput> {
  return generatePersonaAvatarFlow(input);
}

async function generateVideoInBackground(userId: string, personaName: string, avatarImageDataUri: string, script: string) {
  try {
    const response: any = await generateVideoWithProvider({
      messages: [{ role: 'user', content: [{ text: `Animate this avatar to speak naturally. Script: "${script}". Avatar: ${avatarImageDataUri}` }] }],
    });
    const responseText = response?.result?.content?.[0]?.text || '';
    const generatedVideoUrl = responseText.replace('Video generated: ', '').trim();
    if (!generatedVideoUrl) {
      throw new Error('Video generation failed. No video URL returned by provider.');
    }

    const { publicUrl, sizeMB } = await uploadToWasabi(generatedVideoUrl, 'videos');

    await prisma.mediaAsset.create({
      data: {
        name: `Avatar Video: ${personaName}`,
        type: 'VIDEO',
        url: publicUrl,
        size: sizeMB,
        userId: userId,
      }
    });
    console.log(`Successfully generated and saved video for persona ${personaName}`);
  } catch (error) {
    console.error(`Background video generation failed for ${personaName}:`, error);
  }
}

const generatePersonaAvatarFlow = ai.defineFlow(
  {
    name: 'generatePersonaAvatarFlow',
    inputSchema: GeneratePersonaAvatarInputSchema,
    outputSchema: GeneratePersonaAvatarOutputSchema,
  },
  async (input) => {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("User must be authenticated to generate an avatar.");
    }

    // Step 1: Generate the static avatar image first and return it immediately.
    // Use generateImageWithProvider() which creates a properly configured Genkit
    // instance with API keys loaded from the database, avoiding the plugin-less
    // default ai instance which causes "Model not found" errors.
    const imageMessages = [{ role: 'user' as const, content: [{ text: input.avatarDescription }] }];
    const imageResponse = await generateImageWithProvider({ messages: imageMessages });

    // Extract image data URI from response - custom providers return "Image generated: <url>"
    // while Genkit Gemini providers return media directly
    const avatarImageDataUri =
      (imageResponse as any).media?.[0]?.url ||
      (imageResponse as any).result?.content?.[0]?.text?.replace('Image generated: ', '');

    if (!avatarImageDataUri) {
      throw new Error("Failed to generate the initial avatar image.");
    }

    // Sequential upload and DB write to prevent orphaned files
    const { publicUrl: avatarImageUrl, sizeMB: avatarImageSize } = await uploadToWasabi(avatarImageDataUri, 'images');
    await prisma.mediaAsset.create({
      data: {
        name: `Avatar Image: ${input.personaName}`,
        type: 'IMAGE',
        url: avatarImageUrl,
        size: avatarImageSize,
        userId: session.user.id,
      }
    });

    // Step 2: Trigger the video generation in the background without waiting for it.
    generateVideoInBackground(session.user.id, input.personaName, avatarImageDataUri, input.script);

    return {
      avatarImageUrl,
      videoStatus: 'Video generation has started.',
    };
  }
);
