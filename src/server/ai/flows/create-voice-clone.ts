'use server';
/**
 * @fileOverview An AI agent that handles the initial process of voice cloning.
 */

import { ai } from '@/ai/genkit';
import { addVoice, VoiceCloneResponse } from '@/lib/elevenlabs-client';
import { auth } from '@/auth';
import prisma from '@/server/prisma';
import { resolveOwnedVoiceSampleUrls } from '@/server/ai/workflow-contract-helpers';
import {
  CreateVoiceCloneInputSchema,
  CreateVoiceCloneOutputSchema,
  type CreateVoiceCloneInput,
  type CreateVoiceCloneOutput,
} from './types';

// Re-export types for consumers
export type { CreateVoiceCloneInput, CreateVoiceCloneOutput } from './types';

/**
 * Create a voice clone using ElevenLabs API
 * This function validates and processes the request, then calls the ElevenLabs API
 */
export async function createVoiceClone(
  input: CreateVoiceCloneInput
): Promise<CreateVoiceCloneOutput> {
  // Get the current user from the auth session
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("User must be authenticated to create a voice clone.");
  }

  // Validate input
  if (!input.voiceName || input.voiceName.trim() === '') {
    throw new Error("Voice name is required.");
  }

  if (!input.fileUrls || input.fileUrls.length === 0) {
    throw new Error("At least one audio sample is required for voice cloning.");
  }

  // Use the Genkit flow to process the request
  return createVoiceCloneFlow(input);
}

export async function runVoiceCloneWorkflow(
  input: CreateVoiceCloneInput,
  deps: {
    userId: string;
    userEmail?: string | null;
    resolveSamples: (fileUrls: string[], userId: string) => Promise<{ sampleKeys: string[]; sampleUrls: string[] }>;
    addVoiceClone: (
      voiceName: string,
      sampleUrls: string[],
      metadata: { description: string }
    ) => Promise<VoiceCloneResponse>;
    createVoiceCloneRecord: (record: {
      voiceId: string;
      name: string;
      userId: string;
      status: string;
      provider: string;
      sampleUrls: string[];
    }) => Promise<unknown>;
  }
): Promise<CreateVoiceCloneOutput> {
  const { sampleKeys, sampleUrls } = await deps.resolveSamples(input.fileUrls, deps.userId);

  const voiceCloneResponse = await deps.addVoiceClone(
    input.voiceName,
    sampleUrls,
    {
      description: `Voice clone created by ${deps.userEmail || deps.userId} on ${new Date().toISOString()}`,
    }
  );

  await deps.createVoiceCloneRecord({
    voiceId: voiceCloneResponse.voiceId,
    name: input.voiceName,
    userId: deps.userId,
    status: 'completed',
    provider: 'elevenlabs',
    sampleUrls: sampleKeys,
  });

  return {
    voiceId: voiceCloneResponse.voiceId,
    message: `Voice cloning for "${input.voiceName}" has been successfully created with ID ${voiceCloneResponse.voiceId}.`,
  };
}

const createVoiceCloneFlow = ai.defineFlow(
  {
    name: 'createVoiceCloneFlow',
    inputSchema: CreateVoiceCloneInputSchema,
    outputSchema: CreateVoiceCloneOutputSchema,
  },
  async (input) => {
    console.log(`Received voice clone request for: ${input.voiceName}`);
    console.log(`Number of audio samples: ${input.fileUrls.length}`);

    try {
      // Get the current user from the auth session for database records
      const session = await auth();
      const userId = session?.user?.id;

      if (!userId) {
        throw new Error("User must be authenticated to create a voice clone.");
      }

      return runVoiceCloneWorkflow(input, {
        userId,
        userEmail: session.user.email,
        resolveSamples: resolveOwnedVoiceSampleUrls,
        addVoiceClone: addVoice,
        createVoiceCloneRecord: async (record) =>
          (prisma as any).voiceClone.create({
            data: record,
          }),
      });
    } catch (error) {
      console.error('Error creating voice clone:', error);

      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error("ElevenLabs API key is not configured. Please check your settings.");
        }

        // Log the original error but return a user-friendly message
        throw new Error(`Voice cloning failed: ${error.message}`);
      }

      // Generic error fallback
      throw new Error("An unexpected error occurred during voice cloning. Please try again later.");
    }
  }
);
