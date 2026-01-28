'use server';
/**
 * @fileOverview An AI agent that analyzes and ranks thumbnail images for videos.
 */

import { z } from 'zod';
import { generateStructuredOutput } from '@/lib/ai/api-service-manager';
import {
  AnalyzeThumbnailsInputSchema,
  AnalyzeThumbnailsOutputSchema,
  type AnalyzeThumbnailsInput,
  type AnalyzeThumbnailsOutput,
} from './types';

// Re-export types for consumers (this is allowed because we're re-exporting from a non-server file)
export type { AnalyzeThumbnailsInput, AnalyzeThumbnailsOutput } from './types';

export async function analyzeThumbnails(
  input: AnalyzeThumbnailsInput
): Promise<AnalyzeThumbnailsOutput> {
  console.log('[analyzeThumbnails] Starting thumbnail analysis...');

  const prompt = `You are an expert YouTube thumbnail analyst. Analyze and rank the following thumbnails based on their potential to drive clicks and engagement.

${input.videoTopic ? `Video Topic: ${input.videoTopic}` : ''}

Thumbnails to analyze:
${input.thumbnailUrls.map((url, i) => `${i + 1}. ${url}`).join('\n')}

For each thumbnail, provide:
1. A ranking (1 = best)
2. A score from 0-100
3. Strengths (what works well)
4. Weaknesses (what could be improved)
5. Suggestions for improvement

Also provide an overall recommendation.

Respond with a JSON object like:
{
  "rankings": [
    {
      "rank": 1,
      "url": "...",
      "score": 85,
      "strengths": ["Good contrast", "Clear text"],
      "weaknesses": ["Could use more emotion"],
      "suggestions": ["Add a human face"]
    }
  ],
  "overallRecommendation": "..."
}`;

  const result = await generateStructuredOutput(prompt, AnalyzeThumbnailsOutputSchema);
  console.log('[analyzeThumbnails] Using provider:', result.provider, 'model:', result.model);

  if (!result.output?.rankings) {
    throw new Error("The AI failed to analyze the thumbnails.");
  }

  return result.output;
}
