// This file was blank; implementing basic Genkit flow for video topic research (keywords, outline, trends).

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { generateWithProvider } from '@/lib/ai/api-service-manager';

const ResearchVideoTopicInputSchema = z.object({
  topic: z.string().describe('The main topic to research for video ideas.'),
  platform: z.string().default('YouTube').describe('Target platform (e.g., "YouTube", "TikTok").'),
  audience: z.string().optional().describe('Target audience description.'),
});

export type ResearchVideoTopicInput = z.infer<typeof ResearchVideoTopicInputSchema>;

const ResearchVideoTopicOutputSchema = z.object({
  keywords: z.array(z.string()).describe('Relevant SEO keywords and search terms.'),
  outline: z.array(z.string()).describe('Suggested video outline with sections.'),
  trends: z.string().describe('Current trends or hooks for the topic.'),
  titleIdeas: z.array(z.string()).describe('5 suggested video title ideas.'),
});

export type ResearchVideoTopicOutput = z.infer<typeof ResearchVideoTopicOutputSchema>;

export async function researchVideoTopic(input: ResearchVideoTopicInput): Promise<ResearchVideoTopicOutput> {
  return researchVideoTopicFlow(input);
}

const researchVideoTopicPrompt = ai.definePrompt({
  name: 'researchVideoTopicPrompt',
  input: { schema: ResearchVideoTopicInputSchema },
  output: { schema: ResearchVideoTopicOutputSchema },
  prompt: `You are a video content researcher. Research the topic "{{{topic}}}" for {{{platform}}} videos targeting {{{audience}}}.

Provide:
- 10-15 SEO keywords
- A 5-section video outline
- Current trends/hooks for the topic
- 5 engaging title ideas

Make it actionable for video creation.
`,
});

const researchVideoTopicFlow = ai.defineFlow(
  {
    name: 'researchVideoTopicFlow',
    inputSchema: ResearchVideoTopicInputSchema,
    outputSchema: ResearchVideoTopicOutputSchema,
  },
  async (input) => {
    const messages = [
      {
        role: 'system' as const,
        content: [{ text: 'You are a video content researcher. Provide SEO keywords, a 5-section video outline, current trends/hooks, and 5 engaging title ideas for the given topic, platform, and audience. Make it actionable for video creation.' }],
      },
      {
        role: 'user' as const,
        content: [{ text: `Topic: ${input.topic}\nPlatform: ${input.platform}\nAudience: ${input.audience || 'general'}` }],
      },
    ];
    const response = await generateWithProvider({ messages });
    
    // Handle both possible response formats
    const output = 'output' in response ? response.output : response.result;

    if (!output) {
      throw new Error('Failed to research video topic.');
    }

    return output;
  }
);
