// This file was blank; implementing streaming Genkit flow for support chat, similar to creative-assistant-chat.

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { type GenerateRequest } from 'genkit/generate';
import { getAvailableTextGenerator } from '@/lib/ai/api-service-manager';

const SupportChatSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
  message: z.string(),
});

export type SupportChatRequest = z.infer<typeof SupportChatSchema>;

const systemPrompt = `You are ClickVid Support AI, a helpful customer support assistant for the ClickVid Pro video platform.
You assist with technical issues, billing, features, and general questions.
Be empathetic, clear, and solution-oriented. If you can't resolve, suggest contacting human support.
Escalate complex issues (e.g., account suspension) by saying "I'll create a ticket for our team."
Keep responses concise and use bullet points for steps.
`;

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
    const llm = await getAvailableTextGenerator();

    const historyForAi: GenerateRequest['history'] = history?.map(h => ({
      role: h.role,
      content: [{ text: h.content }],
    })) || [];

    const { stream, response } = await llm.stream({
      prompt: message,
      history: historyForAi,
      system: systemPrompt,
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
