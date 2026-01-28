'use server';
/**
 * @fileOverview An AI agent for creative assistant chat functionality.
 */

import { ai } from '@/ai/genkit';
import { generateStreamWithProvider } from '@/lib/ai/api-service-manager';
import {
  CreativeAssistantChatInputSchema,
  creativeAssistantSystemPrompt,
  type CreativeAssistantChatInput,
} from './types';

// Re-export types for consumers
export type { CreativeAssistantChatInput } from './types';

export async function creativeAssistantChat(input: CreativeAssistantChatInput): Promise<ReadableStream<string>> {
  return creativeAssistantChatFlow(input);
}

const creativeAssistantChatFlow = ai.defineFlow(
  {
    name: 'creativeAssistantChatFlow',
    inputSchema: CreativeAssistantChatInputSchema,
    outputSchema: (await import('genkit')).z.any(),
  },
  async ({ history, message }) => {
    // Format messages properly for Genkit
    const formattedHistory = (history || []).map(h => ({
      role: h.role === 'assistant' ? 'model' as 'model' : 'user' as 'user',
      content: [{ text: h.content }]
    }));

    // Combine system prompt, history, and user message
    const messages = [
      { role: 'system' as 'user' | 'model', content: [{ text: creativeAssistantSystemPrompt }] },
      { role: 'user' as 'user' | 'model', content: [{ text: message }] },
      ...formattedHistory
    ];

    const { stream, response } = await generateStreamWithProvider({
      messages: messages
    });

    const encoder = new TextEncoder();
    const transformStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              controller.enqueue(encoder.encode(chunk.content[0].text));
            }
          }
          await response;
        } catch (e) {
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
