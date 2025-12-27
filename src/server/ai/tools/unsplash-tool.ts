
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { createApi } from 'unsplash-js';
import type { Random } from 'unsplash-js/dist/methods/photos/types';
import { getAdminSettings } from '@/server/actions/admin-actions';

const unsplashInputSchema = z.object({
    query: z.string().optional().describe("An optional search query to narrow down the random photo selection."),
});

const unsplashOutputSchema = z.object({
    url: z.string().url().describe("The URL of the random photo."),
    author: z.string().describe("The name of the photographer."),
    description: z.string().nullable().describe("The description of the photo, if available."),
});

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
        const response = await unsplash.photos.getRandom(input);

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
        console.error("Error fetching from Unsplash:", error);
        throw new Error("Failed to fetch data from Unsplash API.");
    }
  }
);
