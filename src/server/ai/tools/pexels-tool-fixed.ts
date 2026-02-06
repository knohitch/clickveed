'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { createClient, type PhotosWithTotalResults } from 'pexels';
import { getAdminSettings } from '@/server/actions/admin-actions';

// Constants
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // 1 second

const pexelsInputSchema = z.object({
    query: z.string().describe("The search query for photos or videos."),
    perPage: z.number().optional().default(10).describe("The number of results to return per page."),
    orientation: z.enum(['landscape', 'portrait', 'square']).optional().describe("The orientation of the photos."),
});

const pexelsOutputSchema = z.array(z.object({
    id: z.number().describe("The ID of the photo."),
    url: z.string().url().describe("The URL to the photo page on Pexels."),
    photographer: z.string().describe("The name of the photographer."),
    thumbnail: z.string().url().describe("URL for a small version of the photo."),
    original: z.string().url().describe("URL for the original size of the photo."),
}));

/**
 * Generic retry function with exponential backoff
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
      console.error(`[Pexels] ${context} attempt ${attempt}/${MAX_RETRIES} failed:`, error);

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
      console.log(`[Pexels] Retrying ${context} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error(`${context} failed after retries`);
}

export const searchPexelsTool = ai.defineTool(
  {
    name: 'searchPexelsPhotos',
    description: 'Search for high-quality photos on Pexels. Use this to find B-roll images or stock photography.',
    inputSchema: pexelsInputSchema,
    outputSchema: pexelsOutputSchema,
  },
  async (input) => {
    const { apiKeys } = await getAdminSettings();
    const pexelsApiKey = apiKeys.pexels;

    if (!pexelsApiKey) {
        throw new Error("Pexels API key is not configured in the application settings.");
    }
    
    const client = createClient(pexelsApiKey);

    try {
        const response = await fetchWithRetry(async () => {
            return await client.photos.search({ 
                query: input.query,
                per_page: input.perPage,
                orientation: input.orientation,
            });
        }, 'Pexels search');

        // Check if response is an error
        if ('error' in response) {
            throw new Error(`Pexels API Error: ${response.error}`);
        }
        
        // At this point, we know it's a PhotosWithTotalResults object
        const photosResponse = response as PhotosWithTotalResults;
        
        return photosResponse.photos.map(photo => ({
            id: photo.id,
            url: photo.url,
            photographer: photo.photographer,
            thumbnail: photo.src.medium,
            original: photo.src.original,
        }));
    } catch (error) {
        console.error("[Pexels] Error fetching from Pexels:", error);
        throw new Error(`Failed to fetch data from Pexels API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);
