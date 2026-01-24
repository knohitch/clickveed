
'use server';
/**
 * @fileOverview An AI agent that transcribes a video and provides word-level timestamps.
 */

import { z } from 'zod';
import { generateStructuredOutput } from '@/lib/ai/api-service-manager';

const GenerateTimedTranscriptInputSchema = z.object({
  videoUrl: z
    .string()
    .url()
    .describe(
      "The public URL of the video file to be transcribed."
    ),
});
export type GenerateTimedTranscriptInput = z.infer<typeof GenerateTimedTranscriptInputSchema>;

export const TimedWordSchema = z.object({
    word: z.string().describe("The transcribed word."),
    start: z.number().describe("The start time of the word in seconds."),
    end: z.number().describe("The end time of the word in seconds."),
});
export type TimedWord = z.infer<typeof TimedWordSchema>;


const GenerateTimedTranscriptOutputSchema = z.object({
  transcript: z.array(TimedWordSchema).describe('An array of transcribed words with their start and end times.'),
});
export type GenerateTimedTranscriptOutput = z.infer<typeof GenerateTimedTranscriptOutputSchema>;

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
