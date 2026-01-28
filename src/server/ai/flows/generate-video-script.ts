'use server';
/**
 * @fileOverview A Genkit flow for video script generation.
 */

import { ai } from '@/ai/genkit';
import { generateWithProvider } from '@/lib/ai/api-service-manager';
import {
  GenerateVideoScriptInputSchema,
  GenerateVideoScriptOutputSchema,
  type GenerateVideoScriptInput,
  type GenerateVideoScriptOutput,
} from './types';

// Re-export types for consumers
export type { GenerateVideoScriptInput, GenerateVideoScriptOutput } from './types';

export async function generateVideoScript(input: GenerateVideoScriptInput): Promise<GenerateVideoScriptOutput> {
  try {
    return await generateVideoScriptFlow(input);
  } catch (error) {
    console.error('Script generation failed:', error);
    // Provide fallback script if AI generation fails
    return {
      script: `[SCENE: Professional video scene]

VOICEOVER: ${input.topic}. ${input.style || 'Learn more'} about this exciting topic that will help you achieve your goals.

[SCENE: Call to action]

VOICEOVER: Take action today and transform your approach.`,
      title: `${input.topic} - ${input.style || 'Guide'}`,
      durationEstimate: input.length || '2 minutes'
    };
  }
}

const generateVideoScriptPrompt = ai.definePrompt({
  name: 'generateVideoScriptPrompt',
  input: { schema: GenerateVideoScriptInputSchema },
  output: { schema: GenerateVideoScriptOutputSchema },
  prompt: `You are an expert video scriptwriter. Generate a complete video script based on the following:

Topic: {{{topic}}}
Style: {{{style}}}
Length: {{{length}}}
Tone: {{{tone}}}

The script should include:
- An engaging hook/intro
- Main content with 3-5 key points
- Call to action/conclusion
- Scene descriptions in [brackets]
- Voiceover/dialogue

Provide a suggested video title and estimated duration. Keep it concise and engaging.
`,
});

const generateVideoScriptFlow = ai.defineFlow(
  {
    name: 'generateVideoScriptFlow',
    inputSchema: GenerateVideoScriptInputSchema,
    outputSchema: GenerateVideoScriptOutputSchema,
  },
  async (input) => {
    // The prompt text is defined in generateVideoScriptPrompt.
    // We need to format it with the input values.
    const formattedPrompt = `You are an expert video scriptwriter. Generate a complete video script based on the following:

Topic: ${input.topic}
Style: ${input.style || 'default'}
Length: ${input.length || '2 minutes'}
Tone: ${input.tone || 'professional'}

The script should include:
- An engaging hook/intro
- Main content with 3-5 key points
- Call to action/conclusion
- Scene descriptions in [brackets]
- Voiceover/dialogue

Provide a suggested video title and estimated duration. Keep it concise and engaging.`;

    const messages = [
      {
        role: 'system' as const,
        content: [{ text: formattedPrompt }],
      },
      // No user message in this case, the system prompt contains all necessary info.
    ];

    const generateResponse = await generateWithProvider({ messages });

    // Type assertion to access the output property
    const output = (generateResponse as any).output;

    if (!output?.script) {
      throw new Error('Failed to generate video script.');
    }

    return output;
  }
);
