
'use server';
/**
 * @fileOverview An AI agent that handles the initial process of voice cloning.
 *
 * - createVoiceClone - A function that simulates the voice cloning process.
 * - CreateVoiceCloneInput - The input type for the function.
 * - CreateVoiceCloneOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { addVoice, VoiceCloneResponse } from '@/lib/elevenlabs-client';
import { auth } from '@/auth';
import prisma from '@/server/prisma';

const CreateVoiceCloneInputSchema = z.object({
  voiceName: z.string().describe('The name for the new cloned voice.'),
  fileUrls: z
    .array(z.string().url())
    .describe(
      "An array of public URLs to the audio samples."
    ),
});
export type CreateVoiceCloneInput = z.infer<typeof CreateVoiceCloneInputSchema>;

const CreateVoiceCloneOutputSchema = z.object({
  voiceId: z.string().describe('A unique identifier for the new voice clone job.'),
  message: z.string().describe('A confirmation message indicating the process has started.'),
});
export type CreateVoiceCloneOutput = z.infer<typeof CreateVoiceCloneOutputSchema>;

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
      
      // Call the ElevenLabs API to create a voice clone
      const voiceCloneResponse: VoiceCloneResponse = await addVoice(
        input.voiceName,
        input.fileUrls,
        {
          description: `Voice clone created by ${session.user.email || userId} on ${new Date().toISOString()}`
        }
      );
      
      // Store the voice clone details in the database for future reference
      // Use type assertion to work around TypeScript issues with Prisma Accelerate extension
      await (prisma as any).voiceClone.create({
        data: {
          voiceId: voiceCloneResponse.voiceId,
          name: input.voiceName,
          userId,
          status: 'completed',
          provider: 'elevenlabs',
          sampleUrls: input.fileUrls, // Store the URLs of the audio samples used
        }
      });
      
      // Return the response to the client
      return {
        voiceId: voiceCloneResponse.voiceId,
        message: `Voice cloning for "${input.voiceName}" has been successfully created with ID ${voiceCloneResponse.voiceId}.`,
      };
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
