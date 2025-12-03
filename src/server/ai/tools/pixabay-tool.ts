
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import axios from 'axios';
import { getAdminSettings } from '@/server/actions/admin-actions';

const pixabayInputSchema = z.object({
    query: z.string().describe("The search query for photos."),
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
      const response = await axios.get(API_URL, {
        params: {
          key: pixabayApiKey,
          q: input.query,
          image_type: input.image_type,
          safesearch: input.safesearch,
          per_page: input.perPage,
        },
      });

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
