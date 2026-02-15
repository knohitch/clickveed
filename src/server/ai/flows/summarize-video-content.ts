'use server';
/**
 * @fileOverview Summarizes video content to provide users with a quick understanding of the video's main points.
 */

import { generateStructuredOutput } from '@/lib/ai/api-service-manager';
import {
  SummarizeVideoContentInputSchema,
  SummarizeVideoContentOutputSchema,
  type SummarizeVideoContentInput,
  type SummarizeVideoContentOutput,
} from './types';

// Re-export types for consumers
export type { SummarizeVideoContentInput, SummarizeVideoContentOutput } from './types';

export async function summarizeVideoContent(input: SummarizeVideoContentInput): Promise<SummarizeVideoContentOutput> {
  try {
    console.log('[summarizeVideoContent] Starting video summarization...');

    const prompt = `You are an expert summarizer of video content.

You will be given a video transcript and your job is to summarize the video content in a concise and informative way, extracting the key points.

Video Transcript: ${input.transcript}

Respond with a JSON object like: {"summary": "Your summary here..."}
`;

    // Use the unified structured output function that handles all providers
    const result = await generateStructuredOutput(prompt, SummarizeVideoContentOutputSchema);
    console.log('[summarizeVideoContent] Using provider:', result.provider, 'model:', result.model);

    if (!result.output?.summary) {
      throw new Error("The AI failed to generate a summary for this content.");
    }

    return result.output;
  } catch (error) {
    console.error('Summarize video content failed:', error);
    // Provide fallback response
    return {
      summary: 'This video covers the main topics discussed. Watch the full video for detailed information.',
    };
  }
}
