
'use server';
/**
 * @fileOverview An AI agent that researches a topic and generates video ideas.
 *
 * - researchVideoTopic - A function that handles the video topic research process.
 * - ResearchVideoTopicInput - The input type for the function.
 * - ResearchVideoTopicOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getAvailableTextGenerator } from '../api-service-manager';

const ResearchVideoTopicInputSchema = z.object({
  topic: z.string().describe('The general topic the user wants to make a video about.'),
});
export type ResearchVideoTopicInput = z.infer<typeof ResearchVideoTopicInputSchema>;

const VideoIdeaSchema = z.object({
    title: z.string().describe("A catchy, SEO-friendly title for the video."),
    description: z.string().describe("A brief, one-paragraph description of the video concept."),
    keywords: z.array(z.string()).describe("A list of 5-7 relevant keywords for discoverability."),
    viralityScore: z.number().int().min(0).max(100).describe("A score from 0 to 100 predicting the idea's potential for high engagement and views."),
    reasoning: z.string().describe("A short explanation for why this idea has potential and the assigned virality score.")
});

const ResearchVideoTopicOutputSchema = z.object({
  ideas: z.array(VideoIdeaSchema).describe("An array of 3-5 distinct video ideas based on the user's topic."),
});
export type ResearchVideoTopicOutput = z.infer<typeof ResearchVideoTopicOutputSchema>;

export async function researchVideoTopic(
  input: ResearchVideoTopicInput
): Promise<ResearchVideoTopicOutput> {
  return researchVideoTopicFlow(input);
}


const researchVideoTopicFlow = ai.defineFlow(
  {
    name: 'researchVideoTopicFlow',
    inputSchema: ResearchVideoTopicInputSchema,
    outputSchema: ResearchVideoTopicOutputSchema,
  },
  async ({topic}) => {
    const prompt = `You are an expert YouTube content strategist and trend analyst.
    Your task is to take a user's topic and generate a list of 3-5 specific, engaging, and potentially viral video ideas.

    **Topic:** "${topic}"

    For each idea, you must provide:
    1.  **Title:** A compelling, clickable title that is optimized for search.
    2.  **Description:** A short paragraph outlining the video's content and angle.
    3.  **Keywords:** A list of 5-7 keywords to help with YouTube SEO.
    4.  **Virality Score:** A score from 0-100 indicating its potential for high engagement. A score of 85+ is considered excellent.
    5.  **Reasoning:** A brief justification for the idea and its score, explaining why it would appeal to viewers (e.g., "addresses a common pain point," "taps into a current trend," "has high emotional potential").

    Think about what makes content shareable: controversy, novelty, strong emotion, high utility, etc. Generate a diverse set of ideas.
    `;

    const {output} = await ai.generate({
        prompt,
        output: {schema: ResearchVideoTopicOutputSchema}
    });
    if (!output?.ideas || output.ideas.length === 0) {
        throw new Error("The AI failed to generate any video ideas for this topic.");
    }
    // Sort ideas by virality score descending
    output.ideas.sort((a, b) => b.viralityScore - a.viralityScore);
    return output;
  }
);
