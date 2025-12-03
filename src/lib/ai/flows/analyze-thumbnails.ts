
'use server';
/**
 * @fileOverview An AI agent that analyzes and compares two video thumbnails.
 *
 * - analyzeThumbnails - A function that handles the thumbnail analysis process.
 * - AnalyzeThumbnailsInput - The input type for the function.
 * - AnalyzeThumbnailsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getAvailableImageGenerator, generateImageWithProvider } from '../api-service-manager';

const AnalyzeThumbnailsInputSchema = z.object({
  thumbnailA_DataUri: z
    .string()
    .describe(
      "Thumbnail A, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
   thumbnailB_DataUri: z
    .string()
    .describe(
      "Thumbnail B, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  videoTitle: z.string().describe('The title of the video these thumbnails are for.'),
  targetAudience: z.string().describe('A description of the target audience for the video.'),
});
export type AnalyzeThumbnailsInput = z.infer<typeof AnalyzeThumbnailsInputSchema>;

const ThumbnailAnalysisSchema = z.object({
    score: z.number().int().min(0).max(100).describe("An engagement score from 0-100 predicting how well this thumbnail will perform."),
    pros: z.array(z.string()).describe("A list of 2-3 key strengths of the thumbnail."),
    cons: z.array(z.string()).describe("A list of 2-3 key weaknesses or areas for improvement."),
    summary: z.string().describe("A concise one-sentence summary of the analysis.")
});

const AnalyzeThumbnailsOutputSchema = z.object({
  analysisA: ThumbnailAnalysisSchema.describe("The detailed analysis for Thumbnail A."),
  analysisB: ThumbnailAnalysisSchema.describe("The detailed analysis for Thumbnail B."),
  recommendation: z.enum(['A', 'B']).describe("The final recommendation of which thumbnail is better ('A' or 'B')."),
  reasoning: z.string().describe("A brief explanation for the final recommendation.")
});
export type AnalyzeThumbnailsOutput = z.infer<typeof AnalyzeThumbnailsOutputSchema>;

export async function analyzeThumbnails(
  input: AnalyzeThumbnailsInput
): Promise<AnalyzeThumbnailsOutput> {
  return analyzeThumbnailsFlow(input);
}


const analyzeThumbnailsFlow = ai.defineFlow(
  {
    name: 'analyzeThumbnailsFlow',
    inputSchema: AnalyzeThumbnailsInputSchema,
    outputSchema: AnalyzeThumbnailsOutputSchema,
  },
  async input => {
    const prompt = ai.definePrompt({
      name: 'analyzeThumbnailsPrompt',
      input: {schema: AnalyzeThumbnailsInputSchema},
      output: {schema: AnalyzeThumbnailsOutputSchema},
      prompt: `You are a world-class YouTube strategy expert with a keen eye for what makes a thumbnail successful.
    Your task is to analyze two competing thumbnails for a video and determine which is more likely to get a higher click-through rate (CTR).

    **Video Context:**
    - **Title:** "{{{videoTitle}}}"
    - **Target Audience:** "{{{targetAudience}}}"

    **Thumbnails for Analysis:**
    - **Thumbnail A:** {{media url=thumbnailA_DataUri}}
    - **Thumbnail B:** {{media url=thumbnailB_DataUri}}

    **Your Analysis Criteria:**
    Evaluate each thumbnail based on the following principles. For each, provide a score from 0-100, a list of 2-3 pros, and 2-3 cons.

    1.  **Clarity & Readability:** Is the thumbnail easy to understand in milliseconds, even on a small screen? Is any text large and legible?
    2.  **Emotional Impact & Intrigue:** Does it evoke a strong emotion (curiosity, excitement, surprise, etc.)? Does it tell a story or pose a question?
    3.  **Composition & Aesthetics:** Is the visual layout clean and well-balanced? Does it use color and contrast effectively to draw the eye to the focal point? Is it visually appealing?
    4.  **Relevance to Context:** How well does the thumbnail align with the video title and target audience? Does it accurately represent the video's content and promise?

    **Final Recommendation:**
    After analyzing both, provide a final recommendation ('A' or 'B') and a brief, conclusive reasoning for your choice.
    `,
    });
    
    // Prepare the messages for the AI using the correct Message type
    const messages = [
      {
        role: 'user' as const,
        content: [{ text: `Analyze these two thumbnails for a video titled "${input.videoTitle}" with target audience "${input.targetAudience}".
        
Thumbnail A: {{media url=${input.thumbnailA_DataUri}}}
Thumbnail B: {{media url=${input.thumbnailB_DataUri}}}` }]
      }
    ];

    // Use the generateImageWithProvider function to generate the response
    const response = await generateImageWithProvider({ messages });

    // Handle different response formats from Genkit vs custom providers
    let textContent: string | undefined;

    if ('output' in response && response.output?.message?.content) {
        // Genkit response format
        textContent = response.output.message.content[0]?.text;
    } else if ('result' in response && response.result?.content) {
        // Custom provider response format
        textContent = response.result.content[0]?.text;
    }

    if (!textContent) {
        throw new Error("The AI failed to generate a thumbnail analysis.");
    }

    // Parse the JSON response to match the expected output schema
    try {
        const parsedResponse = JSON.parse(textContent);
        return parsedResponse;
    } catch (error) {
        console.error("Failed to parse AI response as JSON:", error);
        throw new Error("The AI response was not in the expected format.");
    }
  }
);
