
'use server';
/**
 * @fileOverview An AI agent that repurposes a video transcript into various content formats.
 *
 * - repurposeContent - A function that handles the content repurposing process.
 * - RepurposeContentInput - The input type for the function.
 * - RepurposeContentOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getAvailableTextGenerator } from '../api-service-manager';

const RepurposeContentInputSchema = z.object({
  transcript: z.string().describe('The full transcript of the video content.'),
  format: z.enum(['linkedin-post', 'tweet-thread']).describe('The desired output format for the content.'),
});
export type RepurposeContentInput = z.infer<typeof RepurposeContentInputSchema>;

const RepurposeContentOutputSchema = z.object({
  content: z.string().describe("The repurposed content, formatted for the specified platform."),
});
export type RepurposeContentOutput = z.infer<typeof RepurposeContentOutputSchema>;

export async function repurposeContent(
  input: RepurposeContentInput
): Promise<RepurposeContentOutput> {
  return repurposeContentFlow(input);
}

const getPromptForFormat = (format: RepurposeContentInput['format']) => {
    switch(format) {
        case 'linkedin-post':
            return `You are a social media marketing expert specializing in LinkedIn content. Your task is to convert the following video transcript into an engaging, professional LinkedIn post.

- The post should start with a strong hook to grab attention.
- Use professional yet approachable language.
- Structure the content with clear paragraphs and bullet points for readability.
- Include 3-5 relevant hashtags at the end.
- Keep the post concise and focused on the key takeaways from the transcript.

Video Transcript:
{{{transcript}}}`;
        
        case 'tweet-thread':
            return `You are an expert at writing viral content for X (formerly Twitter). Your task is to convert the following video transcript into a compelling tweet thread.

- The thread should be between 3 to 5 tweets.
- The first tweet must be a strong, engaging hook to make people want to read the rest.
- Each subsequent tweet should build on the last, revealing more information.
- Use emojis where appropriate to increase engagement.
- End the thread with a concluding thought or a question to encourage replies.
- Number each tweet in the format (1/N).

Video Transcript:
{{{transcript}}}`;
        
        default:
            throw new Error(`Unsupported format: ${format}`);
    }
}


const repurposeContentFlow = ai.defineFlow(
  {
    name: 'repurposeContentFlow',
    inputSchema: RepurposeContentInputSchema,
    outputSchema: RepurposeContentOutputSchema,
  },
  async ({ transcript, format }) => {
    const promptTemplate = getPromptForFormat(format);
    const prompt = promptTemplate.replace('{{{transcript}}}', transcript);

    const { output } = await ai.generate({
        prompt,
        output: { schema: RepurposeContentOutputSchema }
    });
    
    if (!output?.content) {
        throw new Error(`Failed to generate content for the format: ${format}`);
    }

    return output;
  }
);
