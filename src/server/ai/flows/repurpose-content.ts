// This file was blank; implementing basic Genkit flow for content repurposing (e.g., video to social posts).

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAvailableTextGenerator } from '@/lib/ai/api-service-manager';

const RepurposeContentInputSchema = z.object({
  originalContent: z.string().describe('The original video script or description to repurpose.'),
  targetPlatform: z.string().default('social media').describe('Target platform (e.g., "TikTok", "LinkedIn", "Twitter").'),
  format: z.string().default('short clips').describe('Desired format (e.g., "short clips", "posts", "thumbnails").'),
});

export type RepurposeContentInput = z.infer<typeof RepurposeContentInputSchema>;

const RepurposeContentOutputSchema = z.object({
  repurposedItems: z.array(z.object({
    type: z.string().describe('Type of repurposed content (e.g., "clip idea", "post caption").'),
    content: z.string().describe('The repurposed content.'),
    estimatedLength: z.string().optional().describe('Estimated length or details.'),
  })).describe('Array of repurposed content ideas.'),
  tips: z.string().describe('Tips for using the repurposed content.'),
});

export type RepurposeContentOutput = z.infer<typeof RepurposeContentOutputSchema>;

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
  async (input) => {
    const { model } = await getAvailableTextGenerator();
    const { output } = await model.generate(repurposeContentPrompt, input);

    if (!output?.repurposedItems || output.repurposedItems.length === 0) {
      throw new Error('Failed to repurpose content.');
    }

    return output;
  }
);
