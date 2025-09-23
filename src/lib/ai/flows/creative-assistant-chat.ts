'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {CreativeAssistantChatSchema} from '@/lib/types';
import type {CreativeAssistantChatRequest} from '@/lib/types';
import { getAvailableTextGenerator } from '../api-service-manager';

// Define request types locally as they are no longer exported from genkit
type MessageRole = 'user' | 'model' | 'system' | 'tool';

interface Message {
  role: MessageRole;
  content: Array<{ text: string }>;
}

interface GenerateRequest {
  model: string;
  messages: Message[];
  config?: any;
  history?: Message[];
}

interface GenerateStreamRequest extends GenerateRequest {}

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
    outputSchema: z.any(),
  },
  async ({ history, message }) => {
    const llm = await getAvailableTextGenerator();

    const historyForAi: GenerateRequest['history'] = history?.map(h => ({
      role: h.role,
      content: [{text: h.content}],
    })) || [];
    
    // Get the stream from the LLM
    const streamResult = await llm.stream({
        prompt: message,
        history: historyForAi,
        system: systemPrompt,
    });
    
    // Transform the stream of structured chunks into a simple string stream
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const iterator = streamResult[Symbol.asyncIterator]();
          while (true) {
            const { value, done } = await iterator.next();
            if (done) break;
            if (value.content) {
              controller.enqueue(encoder.encode(value.content[0].text));
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
    return readableStream;
  }
);
