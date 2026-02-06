
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import axios from 'axios';
import { getAdminSettings } from '@/server/actions/admin-actions';

// Constants from established patterns
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // 1 second

const pixabayInputSchema = z.object({
    query: z.string().describe("The search query for images."),
    image_type: z.enum(['all', 'photo', 'illustration', 'vector']).optional().default('photo').describe("The type of image to search for."),
    safesearch: z.boolean().optional().default(true).describe("Filter out unsafe or explicit content."),
    perPage: z.number().optional().default(10).describe("The number of results to return per page."),
});

const pixabayOutputSchema = z.array(z.object({
    id: z.number().describe("The ID of the image."),
    pageURL: z.string().url().describe("The URL to the image page on Pixabay."),
    user: z.string().describe("The username of the photographer."),
    webformatURL: z.string().url().describe("URL for a medium-sized version of the image."),
    largeImageURL: z.string().url().describe("URL for a high-resolution version of the image."),
}));

/**
 * Generic retry function with exponential backoff
 * Uses same pattern as elevenlabs-client.ts
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
      console.error(`[Pixabay] ${context} attempt ${attempt}/${MAX_RETRIES} failed:`, error);

      // Check if error is retryable
      const isRetryable = error instanceof Error && (
        error.message.includes('timeout') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ETIMEDOUT')
      );

      if (!isRetryable || attempt === MAX_RETRIES) {
        break;
      }

      // Exponential backoff
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`[Pixabay] Retrying ${context} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error(`${context} failed after retries`);
}

export const searchPixabayTool = ai.defineTool(
  {
    name: 'searchPixabayImages',
    description: 'Search for high-quality images on Pixabay, including photos, illustrations, and vectors. Good for general-purpose stock content.',
    inputSchema: pixabayInputSchema,
    outputSchema: pixabayOutputSchema,
  },
  async (input) => {
    const { apiKeys } = await getAdminSettings();
    const pixabayApiKey = apiKeys.pixabay;

    if (!pixabayApiKey) {
        throw new Error("Pixabay API key is not configured in the application settings.");
    }
    
    const API_URL = 'https://pixabay.com/api/';
    
    try {
      // ⬅️ USE RETRY FUNCTION HERE
      const response = await fetchWithRetry(async () => {
        return await axios.get(API_URL, {
          params: {
            key: pixabayApiKey,
            q: input.query,
            image_type: input.image_type,
            safesearch: input.safesearch,
            per_page: input.perPage,
          },
          timeout: DEFAULT_TIMEOUT_MS, // ⬅️ ADD TIMEOUT
        });
      }, 'Pixabay search');

      if (response.data && response.data.hits) {
        return response.data.hits.map((hit: any) => ({
          id: hit.id,
          pageURL: hit.pageURL,
          user: hit.user,
          webformatURL: hit.webformatURL,
          largeImageURL: hit.largeImageURL,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching from Pixabay:', error);
      throw new Error('Failed to fetch data from Pixabay API.');
    }
  }
);
