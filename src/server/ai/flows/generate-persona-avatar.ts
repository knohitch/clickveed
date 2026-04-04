'use server';
/**
 * @fileOverview An AI agent that generates a talking avatar video based on a persona and script.
 */

import { ai } from '@/ai/genkit';
import { generateImageWithProvider } from '@/lib/ai/api-service-manager';
import { uploadToWasabi } from '@/server/services/wasabi-service';
import prisma from '@/server/prisma';
import { auth } from '@/auth';
import { createPersonaAvatarJob, enqueuePersonaAvatarVideoJob } from '@/server/services/persona-avatar-job-service';
import { extractAvatarImageUrl } from '@/server/ai/workflow-contract-helpers';
import {
  GeneratePersonaAvatarInputSchema,
  GeneratePersonaAvatarOutputSchema,
  type GeneratePersonaAvatarInput,
  type GeneratePersonaAvatarOutput,
} from './types';

// Re-export types for consumers
export type { GeneratePersonaAvatarInput, GeneratePersonaAvatarOutput } from './types';

/**
 * Robustly extracts an image URL or data URI from the various response shapes
 * that generateImageWithProvider can return:
 *  - Custom providers  → result.content[0].text = "Image generated: <url>"
 *  - Genkit/Gemini     → media.url  (single object, NOT an array)
 *  - Genkit/Gemini     → message.content[N].media.url
 *  - Genkit/Gemini     → message.content[N].inlineData.data  (base64)
 *  - Raw Google API    → custom.candidates[0].content.parts[N].inlineData.data
 */
export async function generatePersonaAvatar(
  input: GeneratePersonaAvatarInput
): Promise<GeneratePersonaAvatarOutput> {
  return generatePersonaAvatarFlow(input);
}

export async function runPersonaAvatarWorkflow(
  input: GeneratePersonaAvatarInput,
  deps: {
    userId: string;
    generateImage: (messages: Array<{ role: 'user'; content: Array<{ text: string }> }>) => Promise<unknown>;
    uploadImage: (dataUri: string) => Promise<{ publicUrl: string; sizeMB: number }>;
    createMediaAsset: (asset: { name: string; type: 'IMAGE'; url: string; size: number; userId: string }) => Promise<unknown>;
    createJob: (job: { userId: string; personaName: string; script: string; avatarImageUrl: string }) => Promise<{ id: string }>;
    enqueueJob: (jobId: string) => Promise<{ jobStatus: GeneratePersonaAvatarOutput['jobStatus']; videoStatus: string }>;
  }
): Promise<GeneratePersonaAvatarOutput> {
  const imageMessages = [{ role: 'user' as const, content: [{ text: input.avatarDescription }] }];
  const imageResponse = await deps.generateImage(imageMessages);

  const avatarImageDataUri = extractAvatarImageUrl(imageResponse);

  if (!avatarImageDataUri) {
    const provider = (imageResponse as any)?.provider || 'unknown';
    const model = (imageResponse as any)?.model || 'unknown';
    throw new Error(
      `Failed to generate the initial avatar image. No media returned by provider=${provider} model=${model}. ` +
      `Ensure a valid image provider (Gemini API key or Imagen/Replicate credentials) is configured in admin settings.`
    );
  }

  const { publicUrl: avatarImageUrl, sizeMB: avatarImageSize } = await deps.uploadImage(avatarImageDataUri);
  await deps.createMediaAsset({
    name: `Avatar Image: ${input.personaName}`,
    type: 'IMAGE',
    url: avatarImageUrl,
    size: avatarImageSize,
    userId: deps.userId,
  });

  const personaJob = await deps.createJob({
    userId: deps.userId,
    personaName: input.personaName,
    script: input.script,
    avatarImageUrl,
  });
  const queueResult = await deps.enqueueJob(personaJob.id);

  return {
    jobId: personaJob.id,
    jobStatus: queueResult.jobStatus,
    avatarImageUrl,
    videoStatus: queueResult.videoStatus,
    videoUrl: null,
  };
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
    return runPersonaAvatarWorkflow(input, {
      userId: session.user.id,
      generateImage: async (messages) => generateImageWithProvider({ messages }),
      uploadImage: async (dataUri) => uploadToWasabi(dataUri, 'images'),
      createMediaAsset: async (asset) => prisma.mediaAsset.create({ data: asset }),
      createJob: createPersonaAvatarJob,
      enqueueJob: enqueuePersonaAvatarVideoJob,
    });
  }
);
