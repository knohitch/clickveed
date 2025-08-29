
'use server';
/**
 * @fileOverview An AI agent that suggests B-roll footage for a video script
 * and fetches stock video clips based on those suggestions using custom tools.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAvailableTextGenerator, getAvailableStockPhotoTool } from '../api-service-manager';

// ========= Suggest B-Roll Flow =========

const SuggestBrollInputSchema = z.object({
  script: z.string().describe("The video script or a scene from the script."),
});
export type SuggestBrollInput = z.infer<typeof SuggestBrollInputSchema>;

const SuggestBrollOutputSchema = z.object({
  suggestions: z.array(z.string()).describe("A list of 3-5 concise search terms for B-roll footage relevant to the script. e.g., ['person typing on laptop', 'city skyline at night', 'close up of coffee cup']"),
});
export type SuggestBrollOutput = z.infer<typeof SuggestBrollOutputSchema>;

const suggestBrollPrompt = ai.definePrompt({
  name: 'suggestBrollPrompt',
  input: { schema: SuggestBrollInputSchema },
  output: { schema: SuggestBrollOutputSchema },
  prompt: `You are an expert video editor. Your task is to analyze the provided video script segment and suggest relevant B-roll footage.
  
  Provide a list of 3-5 short, descriptive search terms that would yield good stock video clips for the following script:

  Script:
  "{{{script}}}"

  The search terms should be specific and actionable.
  `,
});

export async function suggestBroll(input: SuggestBrollInput): Promise<SuggestBrollOutput> {
    const llm = await getAvailableTextGenerator();
    const { output } = await llm.generate(suggestBrollPrompt, input);

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
  const stockPhotoTool = await getAvailableStockPhotoTool();

  const { output } = await ai.generate({
    prompt: `Find stock photos for the search term: ${input.searchTerm}`,
    tools: [stockPhotoTool],
    config: {
        visualToolMode: "CALL", // Force the model to use the tool
    },
  });
  
  if (!output || !Array.isArray(output) || output.length === 0) {
    throw new Error('Failed to fetch stock videos. No valid response from tool.');
  }

  // The output from the tool is an array of tool call results. We need to process it.
  const videos = output.map(result => ({
      id: String(result.id),
      url: result.original || result.url || result.largeImageURL,
      thumbnail: result.thumbnail || result.webformatURL || result.urls?.thumb,
      description: result.description || `Photo by ${result.photographer || result.user}`,
      photographer: result.photographer || result.user || 'Unknown',
  }));

  return { videos };
}
