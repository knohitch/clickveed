// This file was blank; implementing basic Genkit flow for video script generation.

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { generateWithProvider } from '@/lib/ai/api-service-manager';

const GenerateVideoScriptInputSchema = z.object({
  topic: z.string().describe('The main topic or idea for the video.'),
  style: z.string().optional().describe('The style of the video (e.g., "explainer", "tutorial", "vlog").'),
  length: z.string().optional().default('2 minutes').describe('Target length of the video.'),
  tone: z.string().optional().default('professional').describe('Tone of the script (e.g., "casual", "formal", "humorous").'),
});

export type GenerateVideoScriptInput = z.infer<typeof GenerateVideoScriptInputSchema>;

const GenerateVideoScriptOutputSchema = z.object({
  script: z.string().describe('The generated video script, including scenes, voiceover, and timing cues.'),
  title: z.string().describe('A suggested title for the video.'),
  durationEstimate: z.string().describe('Estimated duration based on the script.'),
});

export type GenerateVideoScriptOutput = z.infer<typeof GenerateVideoScriptOutputSchema>;

export async function generateVideoScript(input: GenerateVideoScriptInput): Promise<GenerateVideoScriptOutput> {
  return generateVideoScriptFlow(input);
}

const generateVideoScriptPrompt = ai.definePrompt({
  name: 'generateVideoScriptPrompt',
  input: { schema: GenerateVideoScriptInputSchema },
  output: { schema: GenerateVideoScriptOutputSchema },
  prompt: `You are an expert video scriptwriter. Generate a complete video script based on the following:

Topic: {{{topic}}}
Style: {{{style}}}
Length: {{{length}}}
Tone: {{{tone}}}

The script should include:
- An engaging hook/intro
- Main content with 3-5 key points
- Call to action/conclusion
- Scene descriptions in [brackets]
- Voiceover/dialogue

Provide a suggested video title and estimated duration. Keep it concise and engaging.
`,
});

const generateVideoScriptFlow = ai.defineFlow(
  {
    name: 'generateVideoScriptFlow',
    inputSchema: GenerateVideoScriptInputSchema,
    outputSchema: GenerateVideoScriptOutputSchema,
  },
  async (input) => {
    // The prompt text is defined in generateVideoScriptPrompt.
    // We need to format it with the input values.
    const formattedPrompt = `You are an expert video scriptwriter. Generate a complete video script based on the following:

Topic: ${input.topic}
Style: ${input.style || 'default'}
Length: ${input.length || '2 minutes'}
Tone: ${input.tone || 'professional'}

The script should include:
- An engaging hook/intro
- Main content with 3-5 key points
- Call to action/conclusion
- Scene descriptions in [brackets]
- Voiceover/dialogue

Provide a suggested video title and estimated duration. Keep it concise and engaging.`;

    const messages = [
      {
        role: 'system' as const,
        content: [{ text: formattedPrompt }],
      },
      // No user message in this case, the system prompt contains all necessary info.
    ];

    const generateResponse = await generateWithProvider({ messages });

    // Type assertion to access the output property
    const output = (generateResponse as any).output;

    if (!output?.script) {
      throw new Error('Failed to generate video script.');
    }

    return output;
  }
);
