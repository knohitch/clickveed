'use server';
/**
 * @fileOverview An AI agent that generates stock media images and uploads them to Wasabi.
 */

import { ai } from '@/ai/genkit';
import { getAvailableImageGenerator } from '@/lib/ai/api-service-manager';
import { uploadToWasabi } from '@/server/services/wasabi-service';
import prisma from '@/server/prisma';
import { auth } from '@/auth';
import {
  GenerateStockMediaInputSchema,
  GenerateStockMediaOutputSchema,
  type GenerateStockMediaInput,
  type GenerateStockMediaOutput,
} from './types';

// Re-export types for consumers
export type { GenerateStockMediaInput, GenerateStockMediaOutput } from './types';

export async function generateStockMedia(
  input: GenerateStockMediaInput
): Promise<GenerateStockMediaOutput> {
  return generateStockMediaFlow(input);
}

const generateStockMediaFlow = ai.defineFlow(
  {
    name: 'generateStockMediaFlow',
    inputSchema: GenerateStockMediaInputSchema,
    outputSchema: GenerateStockMediaOutputSchema,
  },
  async (input) => {
    const generator = await getAvailableImageGenerator();
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("User must be authenticated to generate media.");
    }

    let promptText = input.prompt;
    if (generator.provider === 'gemini') {
      promptText = `Photorealistic stock photo: ${input.prompt}. High quality, professional, clean, for commercial use.`
    }

    const generateResponse = await ai.generate({
      model: generator.model,
      prompt: promptText,
      config: {
        count: 4,
        responseModalities: ['TEXT', 'IMAGE'], // Required for Gemini Image Gen
      }
    });

    // Type assertion to access the media property
    const media = (generateResponse as any).media;

    if (!media || !Array.isArray(media) || media.length === 0) {
      throw new Error('Image generation failed. No media was returned.');
    }

    // Upload all generated images to Wasabi in parallel
    const uploadPromises = media.map(async (img: any, index: number) => {
      const dataUri = img.url; // Assuming the provider returns a data URI
      const { publicUrl, sizeMB } = await uploadToWasabi(dataUri, 'images');

      // Return data needed for the subsequent database write
      return {
        name: `${input.prompt.substring(0, 30)}... #${index + 1}`,
        type: 'IMAGE' as const,
        url: publicUrl,
        size: sizeMB,
        userId: session.user.id,
      };
    });

    const uploadedImagesData = await Promise.all(uploadPromises);

    // Write all records to the database in a single transaction
    await prisma.mediaAsset.createMany({
      data: uploadedImagesData,
    });

    return {
      images: uploadedImagesData.map(d => d.url),
    };
  }
);
