'use server';
/**
 * @fileOverview An AI agent that suggests B-roll footage for a video script
 * and fetches stock video clips based on those suggestions using custom tools.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAvailableTextGenerator, getAvailableStockPhotoTool } from '@/lib/ai/api-service-manager';
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

    // Use direct generation to avoid type issues
    const result = await ai.generate({
        prompt,
        output: { schema: SuggestBrollOutputSchema }
    });

    if (!result.output?.suggestions || result.output.suggestions.length === 0) {
        throw new Error("Failed to generate B-roll suggestions.");
    }
    
    // Return a correctly typed object
    return {
        suggestions: result.output.suggestions
    };
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
    // Use the Pexels video search tool
    const { searchPexelsVideosTool } = await import('../tools/pexels-video-tool');

    const videos = await searchPexelsVideosTool({
      query: input.searchTerm,
      perPage: 5, // Limit to 5 results for better UX
    });

    // Transform the Pexels response to our expected format
    const transformedVideos: StockVideoResult[] = videos.map(video => ({
      id: video.id.toString(),
      url: video.videoUrl,
      thumbnail: video.thumbnail,
      description: `Professional footage of ${input.searchTerm}`,
      photographer: video.photographer,
    }));

    return {
      videos: transformedVideos
    };
  } catch (error) {
    console.error('Failed to fetch stock videos:', error);
    // Fallback to placeholder data if API fails
    return {
      videos: [
        {
          id: `fallback-${Date.now()}`,
          url: 'https://placehold.co/1920x1080/000000/FFFFFF.mp4',
          thumbnail: 'https://placehold.co/400x300/000000/FFFFFF.png',
          description: `Placeholder for ${input.searchTerm}`,
          photographer: 'Fallback Media'
        }
      ]
    };
  }
}
