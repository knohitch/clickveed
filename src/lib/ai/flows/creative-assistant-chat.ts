'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {CreativeAssistantChatSchema} from '@/lib/types';
import type {CreativeAssistantChatRequest} from '@/lib/types';
import { generateStreamWithProvider } from '../api-service-manager';

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
    // Construct the messages array properly for the AI request
    const messages: Message[] = [
      {
        role: 'system',
        content: [{ text: systemPrompt }]
      },
      {
        role: 'user',
        content: [{ text: message }]
      },
      ...(history?.map(h => ({
        role: h.role,
        content: [{text: h.content}]
      })) || [])
    ];
    
    // Get the stream from the LLM using the proper provider function
    const streamResult = await generateStreamWithProvider({
        messages: messages,
    });
    
    // Transform the stream of structured chunks into a simple string stream
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // For Genkit streaming responses, we need to handle the stream properly
          for await (const chunk of streamResult) {
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
    return readableStream;
  }
);
