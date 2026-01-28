'use server';
/**
 * @fileOverview An AI agent that generates a talking avatar video based on a persona and script.
 */

import { ai } from '@/ai/genkit';
import { getAvailableVideoGenerator, getAvailableImageGenerator } from '@/lib/ai/api-service-manager';
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
    const videoGeneratorInfo = await getAvailableVideoGenerator();
    const videoPrompt = [
      { text: `Animate this avatar to speak the following script in a natural way. Script: "${script}"` },
      { media: { url: avatarImageDataUri } }
    ];

    let generateResponse = await ai.generate({
      model: videoGeneratorInfo.model,
      prompt: videoPrompt,
      config: {
        durationSeconds: 8,
        aspectRatio: '16:9',
        personGeneration: 'allow_adult',
      }
    });

    // Type assertion to access the operation property
    let operation = (generateResponse as any).operation;
    if (!operation) {
      throw new Error('Expected the video model to return an operation.');
    }

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      // Type assertion to access the checkOperation method
      operation = await (ai as any).checkOperation(operation);
    }

    if (operation.error) {
      throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    const videoMediaPart = operation.output?.message?.content.find((p: any) => !!p.media);
    if (!videoMediaPart?.media) {
      throw new Error('Video generation failed. No media was returned in the final operation.');
    }

    const { publicUrl, sizeMB } = await uploadToWasabi(videoMediaPart.media.url, 'videos');

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
    const imageGenerator = await getAvailableImageGenerator();
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("User must be authenticated to generate an avatar.");
    }

    // Step 1: Generate the static avatar image first and return it immediately.
    const generateResponse = await ai.generate({
      model: imageGenerator.model,
      prompt: input.avatarDescription,
      config: { responseModalities: ['TEXT', 'IMAGE'] }
    });

    // Type assertion to access the media property
    const imageMedia = (generateResponse as any).media;
    if (!imageMedia || !imageMedia[0]?.url) {
      throw new Error("Failed to generate the initial avatar image.");
    }
    const avatarImageDataUri = imageMedia[0].url;

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
