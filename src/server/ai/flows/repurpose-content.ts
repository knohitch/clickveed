'use server';
/**
 * @fileOverview A Genkit flow for content repurposing (e.g., video to social posts).
 */

import { ai } from '@/ai/genkit';
import { generateWithProvider } from '@/lib/ai/api-service-manager';
import {
  RepurposeContentInputSchema,
  RepurposeContentOutputSchema,
  type RepurposeContentInput,
  type RepurposeContentOutput,
} from './types';

// Re-export types for consumers
export type { RepurposeContentInput, RepurposeContentOutput } from './types';

export async function repurposeContent(input: RepurposeContentInput): Promise<RepurposeContentOutput> {
  return repurposeContentFlow(input);
}

const repurposeContentPrompt = ai.definePrompt({
  name: 'repurposeContentPrompt',
  input: { schema: RepurposeContentInputSchema },
  output: { schema: RepurposeContentOutputSchema },
  prompt: `You are a content repurposing expert. Take the original content and adapt it for {{{targetPlatform}}} in {{{format}}} format.

Original Content: {{{originalContent}}}

Generate 3-5 repurposed items, each with:
- Type (e.g., "TikTok clip", "LinkedIn post")
- Content (script/caption)
- Estimated length (if applicable)

Include 2-3 tips for optimization on the platform.
`,
});

const repurposeContentFlow = ai.defineFlow(
  {
    name: 'repurposeContentFlow',
    inputSchema: RepurposeContentInputSchema,
    outputSchema: RepurposeContentOutputSchema,
  },
  async (input): Promise<RepurposeContentOutput> => {
    const messages = [
      {
        role: 'system' as const,
        content: [{
          text: `You are a content repurposing expert. Take the original content and adapt it for ${input.targetPlatform} in ${input.format} format.

Original Content: ${input.originalContent}

Generate 3-5 repurposed items, each with:
- Type (e.g., "TikTok clip", "LinkedIn post")
- Content (script/caption)
- Estimated length (if applicable)

Include 2-3 tips for optimization on the platform.` }],
      },
    ];

    // Use generateWithProvider instead of model.generate
    const response = await generateWithProvider({ messages });

    // Handle both possible response formats
    const output = ('output' in response ? response.output : response.result) as RepurposeContentOutput;

    if (!output?.repurposedItems || output.repurposedItems.length === 0) {
      throw new Error('Failed to repurpose content.');
    }

    return output;
  }
);
