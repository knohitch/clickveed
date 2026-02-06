
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { createApi } from 'unsplash-js';
import type { Random } from 'unsplash-js/dist/methods/photos/types';
import { getAdminSettings } from '@/server/actions/admin-actions';

// Constants from established patterns
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // 1 second

const unsplashInputSchema = z.object({
    query: z.string().optional().describe("An optional search query to narrow down the random photo selection."),
});

const unsplashOutputSchema = z.object({
    url: z.string().url().describe("The URL of the random photo."),
    author: z.string().describe("The name of the photographer."),
    description: z.string().nullable().describe("The description of the photo, if available."),
});

/**
 * Generic retry function with exponential backoff
 * Uses same pattern as elevenlabs-client.ts and pixabay-tool.ts
 */
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  context: string = 'API call'
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.error(`[Unsplash] ${context} attempt ${attempt}/${MAX_RETRIES} failed:`, error);

      // Check if error is retryable
      const isRetryable = error instanceof Error && (
        error.message.includes('timeout') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('Failed to fetch')
      );

      if (!isRetryable || attempt === MAX_RETRIES) {
        break;
      }

      // Exponential backoff
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`[Unsplash] Retrying ${context} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error(`${context} failed after retries`);
}

export const getUnsplashRandomPhoto = ai.defineTool(
  {
    name: 'getUnsplashRandomPhoto',
    description: 'Fetch a single random high-quality photo from Unsplash. Can be filtered by a search query.',
    inputSchema: unsplashInputSchema,
    outputSchema: unsplashOutputSchema,
  },
  async (input) => {
    const { apiKeys } = await getAdminSettings();
    const unsplashApiKey = apiKeys.unsplash;

    if (!unsplashApiKey) {
        throw new Error("Unsplash Access Key is not configured in the application settings.");
    }

    const unsplash = createApi({
      accessKey: unsplashApiKey,
    });
    
    try {
        // ⬅️ USE RETRY FUNCTION HERE with timeout handling
        const response = await fetchWithRetry(async () => {
            return await unsplash.photos.getRandom(input);
        }, 'Unsplash fetch');

        if (response.errors) {
            throw new Error(`Unsplash API Error: ${response.errors.join(', ')}`);
        }
        
        // The response for getRandom can be a single photo or an array
        const photo = Array.isArray(response.response) ? response.response[0] : response.response;

        if (!photo) {
            throw new Error("No photo returned from Unsplash.");
        }

        return {
            url: photo.urls.regular,
            author: photo.user.name,
            description: photo.alt_description,
        };

    } catch (error) {
        console.error("[Unsplash] Error fetching from Unsplash:", error);
        throw new Error(`Failed to fetch data from Unsplash API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);
