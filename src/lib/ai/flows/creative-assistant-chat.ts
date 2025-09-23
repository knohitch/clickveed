'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {CreativeAssistantChatSchema} from '@/lib/types';
import type {CreativeAssistantChatRequest} from '@/lib/types';

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
    // Format the messages properly for Genkit
    const messages = [
      { role: 'system', content: [{ text: systemPrompt }] },
      { role: 'user', content: [{ text: message }] },
      ...(history?.map(h => ({
        role: h.role,
        content: [{ text: h.content }]
      })) || [])
    ];

    // Use the ai.generateStream with the correct parameters
    const stream = await ai.generateStream({
      model: 'googleai/gemini-1.5-flash',
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
