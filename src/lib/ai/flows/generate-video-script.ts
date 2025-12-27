
'use server';

/**
 * @fileOverview AI-powered video script generator.
 *
 * - generateVideoScript - A function to generate video scripts based on a prompt.
 * - GenerateVideoScriptInput - The input type for the generateVideoScript function.
 * - GenerateVideoScriptOutput - The return type for the generateVideoScript function.
 */

import { generateWithProvider } from '../api-service-manager';
import { z } from 'zod';

const GenerateVideoScriptInputSchema = z.object({
  prompt: z.string().describe('The core topic or idea for the video script.'),
  videoType: z.string().describe('The type or format of the video (e.g., "Commercial", "Explainer", "Social Media Ad").'),
  tone: z.string().describe('The desired tone of the video (e.g., "Humorous", "Formal", "Inspirational").'),
  duration: z.string().describe('The target duration of the video (e.g., "30 seconds", "2 minutes").'),
});

export type GenerateVideoScriptInput = z.infer<typeof GenerateVideoScriptInputSchema>;

const GenerateVideoScriptOutputSchema = z.object({
  script: z.string().describe('The generated video script, formatted and ready for production.'),
});

export type GenerateVideoScriptOutput = z.infer<typeof GenerateVideoScriptOutputSchema>;

export async function generateVideoScript({prompt, videoType, tone, duration}: GenerateVideoScriptInput): Promise<GenerateVideoScriptOutput> {
  const scriptPrompt = `You are an expert AI video scriptwriter. Your task is to generate a compelling and well-structured video script based on the user's requirements.

  Pay close attention to all the details provided:

  - **Core Idea:** ${prompt}
  - **Video Type:** ${videoType}
  - **Desired Tone:** ${tone}
  - **Target Duration:** ${duration}

  Based on this, create a complete script. The script should include scene descriptions, dialogue/voiceover, and camera/action cues where appropriate. Ensure the final script is plausible for the specified duration.
  `;

  try {
    // Use the new API service manager
    const response = await generateWithProvider({
      messages: [
        {
          role: 'user',
          content: [{ text: scriptPrompt }]
        }
      ]
    });

    // Parse the response to extract the script
    const script = (response as any).result?.content?.[0]?.text || '';

    if (!script) {
      throw new Error("The AI failed to generate a script based on the provided inputs.");
    }

    return { script };
  } catch (error) {
    console.error('Video script generation error:', error);
    throw new Error("Failed to generate video script. Please check your AI provider configuration.");
  }
}
