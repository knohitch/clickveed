'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { CreativeAssistantChatSchema } from '@/lib/types';
import type { CreativeAssistantChatRequest } from '@/lib/types';

const systemPrompt = `You are an expert creative assistant and video production strategist named 'ClickVid AI'.
Your goal is to help users brainstorm, refine, and create compelling video content.
Be encouraging, insightful, and provide actionable advice.
When asked for ideas, provide a diverse range. When asked for feedback, be constructive and specific.
Keep your responses concise and easy to read. Use markdown for formatting if it helps clarity (e.g., lists, bold text).
`;

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
    // Format messages properly for Genkit with correct role typing
    const formattedHistory = (history || []).map(h => ({
      role: h.role as 'user' | 'model' | 'system' | 'tool',
      content: [{ text: h.content }]
    }));
    
    // Use the same approach as support-chat but with correct message structure
    const messages = [
      { role: 'system' as 'user' | 'model' | 'system' | 'tool', content: [{ text: systemPrompt }] },
      { role: 'user' as 'user' | 'model' | 'system' | 'tool', content: [{ text: message }] },
      ...formattedHistory
    ];
    
    // Call the Genkit API with the correct parameters directly
    const response = await ai.generateStream({
      model: 'googleai/gemini-1.5-flash',
      messages: messages
    });
    
    // Convert to ReadableStream - this is the core fix
    const encoder = new TextEncoder();
    return new ReadableStream({
      async start(controller) {
        try {
          // Iterate over the response chunks
          for await (const chunk of response) {
            const text = chunk.content?.[0]?.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch(e) {
          console.error("Streaming error:", e);
          controller.enqueue(encoder.encode("\n\n**Error:** An unexpected error occurred."));
        } finally {
          controller.close();
        }
      },
    });
  }
);
