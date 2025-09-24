
'use server';
/**
 * @fileOverview An AI agent that handles initial customer support chats.
 *
 * - supportChat - A streaming flow that handles a chat conversation when human agents are away.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

import {CreativeAssistantChatSchema} from '@/lib/types';
import type {CreativeAssistantChatRequest} from '@/lib/types';
import { getAvailableTextGenerator, generateStreamWithProvider } from '../api-service-manager';


const systemPrompt = `You are a friendly and helpful AI Support Assistant for ClickVid Pro.
Your primary goal is to provide initial assistance to users and gather information for the human support team.

1.  Start by warmly greeting the user and letting them know that the human support team is currently unavailable.
2.  Ask the user to describe their issue or question in detail.
3.  Politely answer any simple, general questions you can about the platform (e.g., "What is ClickVid Pro?", "Can I generate videos from images?").
4.  If the user has a complex or account-specific issue, do NOT try to solve it. Instead, reassure them that you have logged their request and that a human agent will review the conversation and get back to you via email as soon as possible.
5.  Keep your responses concise, empathetic, and professional.
`;

export async function supportChat(
  input: CreativeAssistantChatRequest
): Promise<ReadableStream<string>> {
  return supportChatFlow(input);
}


const supportChatFlow = ai.defineFlow(
  {
    name: 'supportChatFlow',
    inputSchema: CreativeAssistantChatSchema,
    outputSchema: z.any(), // The output is a stream, so we use z.any() here.
  },
  async ({ history, message }) => {
    // Format messages properly for Genkit
    const formattedHistory = (history || []).map(h => ({
      role: h.role as 'user' | 'model',
      content: [{ text: h.content }]
    }));

    // Combine system prompt, history, and user message
    const messages = [
      { role: 'system' as 'user' | 'model', content: [{ text: systemPrompt }] },
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
