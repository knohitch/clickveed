'use server';
/**
 * @fileOverview An AI agent for creative assistant chat functionality.
 */

import { ai } from '@/ai/genkit';
import { generateStreamWithProvider } from '@/lib/ai/api-service-manager';
import { getAdminSettings } from '@/server/actions/admin-actions';
import {
  CreativeAssistantChatInputSchema,
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
    const { appName } = await getAdminSettings();
    const today = new Date().toISOString().slice(0, 10);
    const creativeAssistantSystemPrompt = `You are a Creative AI Assistant for ${appName}, a video marketing platform.
You help users with:
- Video content ideas and scripting
- Thumbnail design suggestions
- SEO optimization for video titles and descriptions
- Content strategy and planning
- Video editing tips and best practices

Be creative, helpful, and provide actionable suggestions. Use markdown formatting for clarity.
When suggesting ideas, be specific and provide examples.
Current date is ${today}. Do not assume older years like 2024 unless explicitly asked for historical context.`;

    // Format messages properly for Genkit
    const formattedHistory = (history || []).map(h => ({
      role: h.role === 'assistant' ? 'model' as 'model' : 'user' as 'user',
      content: [{ text: h.content }]
    }));

    // Combine system prompt, history, and newest user message in chronological order
    const messages = [
      { role: 'system' as 'user' | 'model', content: [{ text: creativeAssistantSystemPrompt }] },
      ...formattedHistory,
      { role: 'user' as 'user' | 'model', content: [{ text: message }] },
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
