'use server';
/**
 * @fileOverview An AI agent that transcribes a video and provides word-level timestamps.
 */

import { generateStructuredOutput } from '@/lib/ai/api-service-manager';
import {
  GenerateTimedTranscriptInputSchema,
  GenerateTimedTranscriptOutputSchema,
  type GenerateTimedTranscriptInput,
  type GenerateTimedTranscriptOutput,
  type TimedWord,
} from './types';

// Re-export types for consumers
export type { GenerateTimedTranscriptInput, GenerateTimedTranscriptOutput, TimedWord } from './types';

export async function generateTimedTranscript(
  input: GenerateTimedTranscriptInput
): Promise<GenerateTimedTranscriptOutput> {
  console.log('[generateTimedTranscript] Starting transcript generation...');

  const prompt = `You are a highly accurate video transcription service that provides word-level timestamps.
Analyze the following video and provide a complete and accurate transcript.
For each word, provide its start and end time in seconds.

Video for transcription:
${input.videoUrl}

Respond with a JSON object like: {"transcript": [{"word": "Hello", "start": 0.0, "end": 0.5}, {"word": "world", "start": 0.6, "end": 1.0}]}`;

  // Use the unified structured output function that handles all providers
  const result = await generateStructuredOutput(prompt, GenerateTimedTranscriptOutputSchema);
  console.log('[generateTimedTranscript] Using provider:', result.provider, 'model:', result.model);

  if (!result.output?.transcript) {
    throw new Error("The AI failed to generate a timed transcript.");
  }
  return result.output;
}
