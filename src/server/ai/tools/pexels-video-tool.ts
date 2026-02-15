'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { createClient } from 'pexels';
import { getAdminSettings } from '@/server/actions/admin-actions';

const pexelsVideoInputSchema = z.object({
    query: z.string().describe("The search query for videos."),
    perPage: z.number().optional().default(10).describe("The number of results to return per page."),
    orientation: z.enum(['landscape', 'portrait']).optional().describe("The orientation of the videos."),
});

const pexelsVideoOutputSchema = z.array(z.object({
    id: z.number().describe("The ID of the video."),
    url: z.string().url().describe("The URL to the video page on Pexels."),
    photographer: z.string().describe("The name of the videographer."),
    thumbnail: z.string().url().describe("URL for a thumbnail of the video."),
    videoUrl: z.string().url().describe("URL for the video file."),
    duration: z.number().describe("The duration of the video in seconds."),
    width: z.number().describe("The width of the video."),
    height: z.number().describe("The height of the video."),
}));

export const searchPexelsVideosTool = ai.defineTool(
  {
    name: 'searchPexelsVideos',
    description: 'Search for high-quality videos on Pexels. Use this to find B-roll footage for video projects.',
    inputSchema: pexelsVideoInputSchema,
    outputSchema: pexelsVideoOutputSchema,
  },
  async (input) => {
    const { apiKeys } = await getAdminSettings();
    const pexelsApiKey = apiKeys.pexels;

    if (!pexelsApiKey) {
        throw new Error("Pexels API key is not configured in the application settings.");
    }
    
    const client = createClient(pexelsApiKey);

    try {
        const response = await client.videos.search({
            query: input.query,
            per_page: input.perPage,
            orientation: input.orientation,
        });

        if ('error' in response) {
            throw new Error(`Pexels API Error: ${response.error}`);
        }

        if (!response.videos || !Array.isArray(response.videos)) {
            throw new Error("Unexpected response format from Pexels API");
        }
        
        return response.videos.map(video => ({
            id: video.id,
            url: video.url,
            photographer: video.user.name,
            thumbnail: video.image, // Thumbnail image URL
            videoUrl: video.video_files[0]?.link || video.url, // Use first video file or fallback to page URL
            duration: video.duration,
            width: video.width,
            height: video.height
        }));
    } catch (error) {
        console.error("Error fetching videos from Pexels:", error);
        throw new Error("Failed to fetch video data from Pexels API.");
    }
  }
);
