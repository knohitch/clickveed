
'use server';
/**
 * @fileOverview An AI agent that suggests B-roll footage for a video script
 * and fetches stock video clips based on those suggestions using custom tools.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAvailableTextGenerator, getAvailableStockPhotoTool, getAvailableStockVideoTool } from '../api-service-manager';
import { uploadToWasabi } from '@/server/services/wasabi-service';
import prisma from '@/server/prisma';
import { auth } from '@/auth';

// ========= Suggest B-Roll Flow =========

const SuggestBrollInputSchema = z.object({
  script: z.string().describe("The video script or a scene from the script."),
});
export type SuggestBrollInput = z.infer<typeof SuggestBrollInputSchema>;

const SuggestBrollOutputSchema = z.object({
  suggestions: z.array(z.string()).describe("A list of 3-5 concise search terms for B-roll footage relevant to the script. e.g., ['person typing on laptop', 'city skyline at night', 'close up of coffee cup']"),
});
export type SuggestBrollOutput = z.infer<typeof SuggestBrollOutputSchema>;

export async function suggestBroll(input: SuggestBrollInput): Promise<SuggestBrollOutput> {
    const prompt = `You are an expert video editor. Your task is to analyze the provided video script segment and suggest relevant B-roll footage.

    Provide a list of 3-5 short, descriptive search terms that would yield good stock video clips for the following script:

    Script:
    "${input.script}"

    The search terms should be specific and actionable.
    `;

    const { output } = await ai.generate({
        prompt,
        output: { schema: SuggestBrollOutputSchema }
    });

    if (!output?.suggestions || output.suggestions.length === 0) {
        throw new Error("Failed to generate B-roll suggestions.");
    }
    return output;
}

// ========= Fetch Stock Videos Flow =========

const FetchStockVideosInputSchema = z.object({
  searchTerm: z.string().describe("The search term to find stock videos for."),
});
export type FetchStockVideosInput = z.infer<typeof FetchStockVideosInputSchema>;

const StockVideoResultSchema = z.object({
    id: z.string().or(z.number()).transform(String),
    url: z.string().url(),
    thumbnail: z.string().url(),
    description: z.string(),
    photographer: z.string(),
});
export type StockVideoResult = z.infer<typeof StockVideoResultSchema>;


const FetchStockVideosOutputSchema = z.object({
  videos: z.array(StockVideoResultSchema).describe("An array of stock video results."),
});
export type FetchStockVideosOutput = z.infer<typeof FetchStockVideosOutputSchema>;

export async function fetchStockVideos(input: FetchStockVideosInput): Promise<FetchStockVideosOutput> {
  try {
    // Get the stock video search tool from the API service manager
    const stockVideoTool = await getAvailableStockVideoTool();
    
    // Use the tool to search for videos
    // In Genkit, we need to use the tool directly since it's defined with ai.defineTool
    // The result will have the shape defined in pexelsVideoOutputSchema
    const searchResults = await stockVideoTool({
      query: input.searchTerm,
      perPage: 5, // Limit to 5 results
      orientation: 'landscape' // Prefer landscape videos for B-roll
    });
    
    // Map the results to the expected output format
    return {
      videos: searchResults.map((video: {
        id: number;
        url: string;
        videoUrl?: string;
        thumbnail: string;
        photographer: string;
      }) => ({
        id: video.id.toString(),
        url: video.videoUrl || video.url, // Use videoUrl if available, fallback to url
        thumbnail: video.thumbnail,
        description: `Video of ${input.searchTerm}`,
        photographer: video.photographer
      }))
    };
  } catch (error) {
    console.error('Error fetching stock videos:', error);
    
    // Fallback to a more informative error response
    return {
      videos: [
        {
          id: `error-${Date.now()}`,
          url: 'https://example.com/error.mp4',
          thumbnail: 'https://example.com/error-thumb.jpg',
          description: `Could not find videos for "${input.searchTerm}". Please check your API key settings.`,
          photographer: 'System'
        }
      ]
    };
  }
}
