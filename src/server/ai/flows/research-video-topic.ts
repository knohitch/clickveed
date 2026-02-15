'use server';
/**
 * @fileOverview A Genkit flow for video topic research (keywords, outline, trends).
 */

import { ai } from '@/ai/genkit';
import { generateWithProvider } from '@/lib/ai/api-service-manager';
import {
  ResearchVideoTopicInputSchema,
  ResearchVideoTopicOutputSchema,
  type ResearchVideoTopicInput,
  type ResearchVideoTopicOutput,
} from './types';

// Re-export types for consumers
export type { ResearchVideoTopicInput, ResearchVideoTopicOutput } from './types';

export async function researchVideoTopic(input: ResearchVideoTopicInput): Promise<ResearchVideoTopicOutput> {
  try {
    return await researchVideoTopicFlow(input);
  } catch (error) {
    console.error('Research video topic failed:', error);
    // Provide fallback response if AI generation fails
    return {
      keywords: [`${input.topic} video`, 'trending content', 'viral videos'],
      outline: [
        { section: 'Introduction', description: `Hook viewers about ${input.topic}` },
        { section: 'Main Point 1', description: 'Key insight or value' },
        { section: 'Main Point 2', description: 'Additional information' },
        { section: 'Main Point 3', description: 'Expert tips or tricks' },
        { section: 'Conclusion', description: 'Call to action' },
      ],
      trends: ['Tutorial format', 'Listicle', 'Behind the scenes'],
      titles: [
        `Everything About ${input.topic}`,
        `${input.topic} - Complete Guide`,
        `How to Master ${input.topic}`,
        `${input.topic} You Need to Know`,
        `${input.topic} Tips and Tricks`,
      ],
    };
  }
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
  async (input): Promise<ResearchVideoTopicOutput> => {
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
    const output = ('output' in response ? response.output : response.result) as ResearchVideoTopicOutput;

    if (!output) {
      throw new Error('Failed to research video topic.');
    }

    return output;
  }
);
