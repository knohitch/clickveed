'use server';
/**
 * @fileOverview An AI agent that suggests B-roll footage for a video script
 * and fetches stock video clips based on those suggestions.
 */

import { generateStructuredOutput } from '@/lib/ai/api-service-manager';
import {
  SuggestBrollInputSchema,
  SuggestBrollOutputSchema,
  FetchStockVideosInputSchema,
  FetchStockVideosOutputSchema,
  type SuggestBrollInput,
  type SuggestBrollOutput,
  type FetchStockVideosInput,
  type FetchStockVideosOutput,
  type StockVideoResult,
} from './types';

// Re-export types for consumers
export type { SuggestBrollInput, SuggestBrollOutput, FetchStockVideosInput, FetchStockVideosOutput, StockVideoResult } from './types';

export async function suggestBroll(input: SuggestBrollInput): Promise<SuggestBrollOutput> {
  console.log('[suggestBroll] Starting B-roll suggestion generation...');

  const prompt = `You are an expert video editor. Your task is to analyze the provided video script segment and suggest relevant B-roll footage.

    Provide a list of 3-5 short, descriptive search terms that would yield good stock video clips for the following script:

    Script:
    "${input.script}"

    The search terms should be specific and actionable.
    
    Respond with a JSON object like: {"suggestions": ["search term 1", "search term 2", "search term 3"]}
    `;

  // Use the unified structured output function that handles all providers
  const result = await generateStructuredOutput(prompt, SuggestBrollOutputSchema);
  console.log('[suggestBroll] Using provider:', result.provider, 'model:', result.model);

  if (!result.output?.suggestions || result.output.suggestions.length === 0) {
    throw new Error("Failed to generate B-roll suggestions.");
  }

  // Return a correctly typed object
  return {
    suggestions: result.output.suggestions
  };
}

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
    throw new Error(
      `Failed to fetch stock videos for "${input.searchTerm}". Please check your Pexels API key or try again later.`
    );
  }
}
