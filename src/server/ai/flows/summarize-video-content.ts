
'use server';

/**
 * @fileOverview Summarizes video content to provide users with a quick understanding of the video's main points.
 *
 * - summarizeVideoContent - A function that handles the video content summarization process.
 * - SummarizeVideoContentInput - The input type for the summarizeVideoContent function.
 * - SummarizeVideoContentOutput - The return type for the summarizeVideoContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getAvailableTextGenerator } from '@/lib/ai/api-service-manager';

const SummarizeVideoContentInputSchema = z.object({
  videoUrl: z
    .string().optional()
    .describe('The URL of the video to be summarized.'),
  transcript: z
    .string()
    .describe('The transcript of the video, to be used for summarization.'),
});
export type SummarizeVideoContentInput = z.infer<typeof SummarizeVideoContentInputSchema>;

const SummarizeVideoContentOutputSchema = z.object({
  summary: z.string().describe('A summary of the video content.'),
});
export type SummarizeVideoContentOutput = z.infer<typeof SummarizeVideoContentOutputSchema>;

export async function summarizeVideoContent(input: SummarizeVideoContentInput): Promise<SummarizeVideoContentOutput> {
  return summarizeVideoContentFlow(input);
}

const summarizeVideoContentFlow = ai.defineFlow(
  {
    name: 'summarizeVideoContentFlow',
    inputSchema: SummarizeVideoContentInputSchema,
    outputSchema: SummarizeVideoContentOutputSchema,
  },
  async input => {
    const prompt = `You are an expert summarizer of video content.

You will be given a video transcript and your job is to summarize the video content in a concise and informative way, extracting the key points.

Video Transcript: ${input.transcript}
`;

    // Generate the summary using the AI service
    const { output } = await ai.generate({
      prompt,
      output: { schema: SummarizeVideoContentOutputSchema }
    });
    
    if (!output?.summary) {
      throw new Error("The AI failed to generate a summary for this content.");
    }
    
    return output;
  }
);
