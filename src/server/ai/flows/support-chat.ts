'use server';
/**
 * @fileOverview A streaming Genkit flow for support chat.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { generateStreamWithProvider } from '@/lib/ai/api-service-manager';
import {
  SupportChatSchema,
  supportChatSystemPrompt,
  type SupportChatRequest,
} from './types';

// Re-export types for consumers
export type { SupportChatRequest } from './types';

export async function supportChat(input: SupportChatRequest): Promise<ReadableStream<string>> {
  return supportChatFlow(input);
}

const supportChatFlow = ai.defineFlow(
  {
    name: 'supportChatFlow',
    inputSchema: SupportChatSchema,
    outputSchema: z.any(),
  },
  async ({ history, message }) => {
    // Format messages properly for Genkit
    const formattedHistory = (history || []).map(h => ({
      role: h.role === 'assistant' ? 'model' as 'model' : 'user' as 'user',
      content: [{ text: h.content }]
    }));

    // Combine system prompt, history, and user message
    const messages = [
      { role: 'system' as 'user' | 'model', content: [{ text: supportChatSystemPrompt }] },
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
