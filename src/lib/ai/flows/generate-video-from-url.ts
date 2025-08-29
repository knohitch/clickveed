
'use server';

/**
 * @fileOverview An AI agent that generates a video script from a URL.
 *
 * - generateVideoFromUrl - A function that handles the script generation process.
 * - GenerateVideoFromUrlInput - The input type for the function.
 * - GenerateVideoFromUrlOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getAvailableTextGenerator } from '../api-service-manager';

const GenerateVideoFromUrlInputSchema = z.object({
  url: z.string().url({ message: 'Please enter a valid URL.' }),
  topic: z.string().min(10, { message: 'Topic must be at least 10 characters.' }),
});
export type GenerateVideoFromUrlInput = z.infer<typeof GenerateVideoFromUrlInputSchema>;

const GenerateVideoFromUrlOutputSchema = z.object({
  script: z.string().describe('The generated video script, formatted for production.'),
});
export type GenerateVideoFromUrlOutput = z.infer<typeof GenerateVideoFromUrlOutputSchema>;


export async function generateVideoFromUrl(
  input: GenerateVideoFromUrlInput
): Promise<GenerateVideoFromUrlOutput> {
  return generateVideoFromUrlFlow(input);
}


const generateVideoFromUrlFlow = ai.defineFlow(
  {
    name: 'generateVideoFromUrlFlow',
    inputSchema: GenerateVideoFromUrlInputSchema,
    outputSchema: GenerateVideoFromUrlOutputSchema,
  },
  async (input) => {
    const llm = await getAvailableTextGenerator();
    
    const prompt = ai.definePrompt({
      name: 'generateVideoFromUrlPrompt',
      input: {schema: GenerateVideoFromUrlInputSchema},
      output: {schema: GenerateVideoFromUrlOutputSchema},
      prompt: `You are an expert video scriptwriter who specializes in converting web content into engaging videos.

    Your task is to create a short video script (around 1 minute) based on the content found at the following URL and focused on the given topic.

    - URL: {{{url}}}
    - Topic: {{{topic}}}

    First, conceptually summarize the key points of the content from the URL related to the topic.
    Then, use that summary to write a complete video script. The script should include scene descriptions, voiceover text, and suggested visuals.

    IMPORTANT: Since you cannot access external URLs directly, you must act as if you have read the content at the URL. Base your script on the general knowledge you have about the provided topic and assume it reflects the content of the URL.

    For example, if the URL is about 'eco-friendly-gardening' and the topic is 'composting for beginners', generate a script that explains composting basics, assuming that information is in the article.

    Respond ONLY with the JSON object containing the final script.
    `,
    });
    
    // In a real implementation with URL scraping capabilities,
    // you would first fetch and parse the content from input.url.
    // For now, the prompt instructs the model to simulate this.
    const {output} = await llm.generate(prompt, input);

    if (!output?.script) {
        throw new Error("The AI failed to generate a script from the provided URL and topic.");
    }
    return output;
  }
);

    