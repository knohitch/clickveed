'use server';
/**
 * @fileOverview An AI agent that analyzes and compares two thumbnail images for videos.
 */

import { generateStructuredOutput } from '@/lib/ai/api-service-manager';
import {
  AnalyzeThumbnailsOutputSchema,
  type AnalyzeThumbnailsInput,
  type AnalyzeThumbnailsOutput,
} from './types';

// Re-export types for consumers (this is allowed because we're re-exporting from a non-server file)
export type { AnalyzeThumbnailsInput, AnalyzeThumbnailsOutput } from './types';

export async function analyzeThumbnails(
  input: AnalyzeThumbnailsInput
): Promise<AnalyzeThumbnailsOutput> {
  console.log('[analyzeThumbnails] Starting thumbnail comparison analysis...');

  const prompt = `You are an expert YouTube thumbnail analyst. Compare the following two thumbnails (A and B) and determine which one would drive more clicks and engagement.

Video Title: ${input.videoTitle}
Target Audience: ${input.targetAudience}

For each thumbnail, provide:
1. A brief summary of the thumbnail's effectiveness
2. An engagement score from 0-100
3. A list of pros (what works well)
4. A list of cons (what could be improved)

Then provide your recommendation (either "A" or "B") with reasoning.

Respond with a JSON object like:
{
  "analysisA": {
    "summary": "Brief summary of thumbnail A...",
    "score": 75,
    "pros": ["Good contrast", "Clear text"],
    "cons": ["Could use more emotion"]
  },
  "analysisB": {
    "summary": "Brief summary of thumbnail B...",
    "score": 82,
    "pros": ["Eye-catching colors", "Human face visible"],
    "cons": ["Text is small"]
  },
  "recommendation": "B",
  "reasoning": "Thumbnail B is more likely to generate clicks because..."
}`;

  const result = await generateStructuredOutput(prompt, AnalyzeThumbnailsOutputSchema);
  console.log('[analyzeThumbnails] Using provider:', result.provider, 'model:', result.model);

  if (!result.output?.analysisA || !result.output?.analysisB) {
    throw new Error("The AI failed to analyze the thumbnails.");
  }

  return result.output;
}
