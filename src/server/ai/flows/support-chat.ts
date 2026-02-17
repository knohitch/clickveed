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
            // Handle both Genkit format ({ content: [{ text }] }) and
            // custom provider client format ({ text, model, provider })
            let text = '';
            if (chunk.text) {
              text = chunk.text;
            } else if (chunk.content && Array.isArray(chunk.content)) {
              text = chunk.content[0]?.text || '';
            }
            if (text) {
              controller.enqueue(encoder.encode(text));
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
