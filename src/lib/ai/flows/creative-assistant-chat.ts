
'use server';
/**
 * @fileOverview An AI agent that acts as a creative assistant for video creators.
 *
 * - creativeAssistantChat - a streaming flow that handles a chat conversation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {GenerateRequest} from 'genkit/generate';
import {CreativeAssistantChatSchema} from '@/lib/types';
import type {CreativeAssistantChatRequest} from '@/lib/types';
import { getAvailableTextGenerator } from '../api-service-manager';


const systemPrompt = `You are an expert creative assistant and video production strategist named 'ClickVid AI'.
Your goal is to help users brainstorm, refine, and create compelling video content.
Be encouraging, insightful, and provide actionable advice.
When asked for ideas, provide a diverse range. When asked for feedback, be constructive and specific.
Keep your responses concise and easy to read. Use markdown for formatting if it helps clarity (e.g., lists, bold text).
`;

// This is the main flow that will be called by the server action.
// It returns a stream that the frontend can read from.
export async function creativeAssistantChat(
  input: CreativeAssistantChatRequest
): Promise<ReadableStream<string>> {
  return creativeAssistantChatFlow(input);
}


const creativeAssistantChatFlow = ai.defineFlow(
  {
    name: 'creativeAssistantChatFlow',
    inputSchema: CreativeAssistantChatSchema,
    outputSchema: z.any(), // The output is a stream, so we use z.any() here.
  },
  async ({ history, message }) => {
    const llm = await getAvailableTextGenerator();

    const historyForAi: GenerateRequest['history'] = history?.map(h => ({
      role: h.role,
      content: [{text: h.content}],
    })) || [];
    
    const { stream, response } = await llm.stream({
        prompt: message,
        history: historyForAi,
        system: systemPrompt,
    });
    
    // We need to transform the stream of structured chunks into a simple string stream.
    const encoder = new TextEncoder();
    const transformStream = new ReadableStream({
      async start(controller) {
        try {
            for await (const chunk of stream) {
                if (chunk.content) {
                    controller.enqueue(encoder.encode(chunk.content[0].text));
                }
            }
            // Wait for the full response to settle, which can catch final errors.
            await response;
        } catch(e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown streaming error occurred.";
            controller.enqueue(encoder.encode(`\n\n**Error:** ${errorMessage}`));
        } finally {
            controller.close();
        }
      },
    });

    return transformStream;
  }
);

    