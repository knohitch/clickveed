'use server';
/**
 * @fileOverview A Genkit flow for video topic research (keywords, outline, trends).
 */

import { ai } from '@/ai/genkit';
import { generateStructuredOutput } from '@/lib/ai/api-service-manager';
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
        'Introduction: Hook viewers about the topic',
        'Main Point 1: Key insight or value',
        'Main Point 2: Additional information',
        'Main Point 3: Expert tips or tricks',
        'Conclusion: Call to action',
      ],
      trends: 'Tutorial format, listicles, and behind-the-scenes content are trending.',
      titleIdeas: [
        `Everything About ${input.topic}`,
        `${input.topic} - Complete Guide`,
        `How to Master ${input.topic}`,
        `${input.topic} You Need to Know`,
        `${input.topic} Tips and Tricks`,
      ],
    };
  }
}

const researchVideoTopicFlow = ai.defineFlow(
  {
    name: 'researchVideoTopicFlow',
    inputSchema: ResearchVideoTopicInputSchema,
    outputSchema: ResearchVideoTopicOutputSchema,
  },
  async (input): Promise<ResearchVideoTopicOutput> => {
    // Use generateStructuredOutput() which properly handles provider selection,
    // JSON schema enforcement, and response parsing — identical to find-viral-clips.ts.
    // The old generateWithProvider() returned raw text that couldn't be parsed as structured data.
    const prompt = `Research the topic "${input.topic}" for ${input.platform} videos targeting ${input.audience || 'a general audience'}.

Provide:
- 10-15 relevant SEO keywords and search terms
- A 5-section video outline (each section as a single descriptive string)
- Current trends or hooks for this topic (as a single string)
- 5 engaging video title ideas

Respond with ONLY a valid JSON object matching this exact structure:
{
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "outline": [
    "Introduction: Hook viewers with an interesting fact or question about the topic",
    "Section 1: Cover the first key point with examples",
    "Section 2: Dive deeper into a related subtopic",
    "Section 3: Share expert tips or common mistakes to avoid",
    "Conclusion: Summarize key takeaways and call to action"
  ],
  "trends": "Describe the current trending formats and hooks for this topic in one paragraph.",
  "titleIdeas": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"]
}`;

    const result = await generateStructuredOutput(prompt, ResearchVideoTopicOutputSchema);

    if (!result.output) {
      throw new Error('Failed to research video topic.');
    }

    return result.output;
  }
);
