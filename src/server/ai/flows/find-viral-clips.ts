'use server';
/**
 * @fileOverview An AI agent that analyzes a video transcript to find potentially viral clips.
 */

import { generateStructuredOutput } from '@/lib/ai/api-service-manager';
import { getVideoWithTranscript } from '@/server/services/clipService';
import {
  FindViralClipsInputSchema,
  FindViralClipsOutputSchema,
  type FindViralClipsInput,
  type FindViralClipsOutput,
} from './types';

// Re-export types for consumers
export type { FindViralClipsInput, FindViralClipsOutput } from './types';

export async function findViralClips(
  input: FindViralClipsInput
): Promise<FindViralClipsOutput> {
  console.log('[findViralClips] Starting viral clips analysis for video:', input.videoId);

  // Step 1: Get the video and its transcript from the database.
  const videoData = await getVideoWithTranscript(input.videoId);
  if (!videoData) {
    throw new Error(`Video with ID ${input.videoId} not found or has no transcript.`);
  }
  const { transcript } = videoData;

  // Step 2: Use the transcript to find viral clips.
  const prompt = `You are a viral content expert for platforms like TikTok and YouTube Shorts.
Your task is to analyze the provided video transcript and identify 3-5 short, engaging, and potentially viral clips.

Video Transcript with Timestamps:
"""
${transcript}
"""

For each clip you identify, you must determine the start and end times in seconds based on the timestamps in the transcript.
Then, provide:
1.  A catchy, short title for the potential clip.
2.  The estimated start and end times in seconds.
3.  A brief reason explaining its viral potential (e.g., "addresses a controversial point," "has a strong emotional peak," "is a highly satisfying moment").
4.  A "virality score" from 0-100 based on the text content.

Analyze the transcript to find the most impactful moments.

Respond with a JSON object like:
{
  "clips": [
    {"id": 1, "title": "Clip Title", "startTime": 10, "endTime": 25, "reason": "Why it's viral", "score": 85}
  ]
}`;

  // Use the unified structured output function that handles all providers
  const result = await generateStructuredOutput(prompt, FindViralClipsOutputSchema);
  console.log('[findViralClips] Using provider:', result.provider, 'model:', result.model);

  if (!result.output || !result.output.clips || result.output.clips.length === 0) {
    throw new Error("AI failed to generate viral clip suggestions from the transcript.");
  }
  return result.output;
}
