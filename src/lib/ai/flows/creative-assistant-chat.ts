'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { CreativeAssistantChatSchema } from '@/lib/types';
import type { CreativeAssistantChatRequest } from '@/lib/types';
import { generateStreamWithProvider, getAvailableTextGenerator } from '@/lib/ai/api-service-manager';
import { getAdminSettings } from '@/server/actions/admin-actions';

// Enhanced system prompt with more specific guidance
const systemPrompt = `You are an expert creative assistant and video production strategist named 'ClickVid AI'.
Your goal is to help users brainstorm, refine, and create compelling video content.

Focus areas:
- Video scripting and storyboarding
- Content strategy for various platforms (YouTube, TikTok, Instagram, etc.)
- Audience engagement techniques
- Video editing suggestions and best practices
- Trending content ideas and formats

Be encouraging, insightful, and provide actionable advice.
When asked for ideas, provide a diverse range. When asked for feedback, be constructive and specific.
Keep your responses concise and easy to read. Use markdown for formatting to enhance clarity (lists, bold text, headers).

Remember to tailor your advice to the user's specific platform, audience, and content goals.
`;

/**
 * Main entry point for the creative assistant chat flow
 * Handles both message history and new messages
 */
export async function creativeAssistantChat(
  input: CreativeAssistantChatRequest
): Promise<ReadableStream<string>> {
  return creativeAssistantChatFlow(input);
}

/**
 * Genkit flow definition for the creative assistant chat
 * This flow properly handles streaming responses from both Google AI and OpenAI
 */
const creativeAssistantChatFlow = ai.defineFlow(
  {
    name: 'creativeAssistantChatFlow',
    inputSchema: CreativeAssistantChatSchema,
    outputSchema: z.any(), // The output is a stream, so we use z.any() here
  },
  async ({ history, message }) => {
    try {
      // Check if we have API keys configured
      const { apiKeys } = await getAdminSettings();
      const provider = await getAvailableTextGenerator().catch(e => {
        console.error("Error getting LLM provider:", e);
        throw new Error("No AI provider available. Please configure API keys in admin settings.");
      });

      // Format messages properly for AI providers with correct role typing
      const formattedHistory = (history || []).map(h => ({
        role: h.role as 'user' | 'model' | 'system' | 'tool',
        content: [{ text: h.content }]
      }));
      
      // Create message array with system prompt first for proper context
      const messages = [
        { role: 'system' as 'user' | 'model' | 'system' | 'tool', content: [{ text: systemPrompt }] },
        ...formattedHistory,
        { role: 'user' as 'user' | 'model' | 'system' | 'tool', content: [{ text: message }] }
      ];
      
      // Call the AI service manager to handle different providers
      // This will automatically use either Google AI or OpenAI depending on available API keys
      const streamResponse = await generateStreamWithProvider({
        messages: messages
      });
      
      // Convert to a standard ReadableStream for the client
      const encoder = new TextEncoder();
      return new ReadableStream({
        async start(controller) {
          try {
            // Process the stream chunks
            for await (const chunk of streamResponse.stream) {
              const text = chunk.content?.[0]?.text;
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            }
          } catch(e) {
            console.error("Streaming error:", e);
            controller.enqueue(encoder.encode("\n\n**Error:** An unexpected error occurred. Please try again later."));
          } finally {
            controller.close();
          }
        },
      });
    } catch(error) {
      // Handle initialization errors
      console.error("Creative assistant chat error:", error);
      const encoder = new TextEncoder();
      return new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`**Error:** ${error instanceof Error ? error.message : "An unexpected error occurred."}`));
          controller.close();
        }
      });
    }
  }
);
