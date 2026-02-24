'use server';
/**
 * @fileOverview An AI agent that generates stock media images and uploads them to Wasabi.
 */

import { ai } from '@/ai/genkit';
import { generateImageWithProvider } from '@/lib/ai/api-service-manager';
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
  try {
    return await generateStockMediaFlow(input);
  } catch (error) {
    console.error('Generate stock media failed:', error);
    return { images: [] };
  }
}

const generateStockMediaFlow = ai.defineFlow(
  {
    name: 'generateStockMediaFlow',
    inputSchema: GenerateStockMediaInputSchema,
    outputSchema: GenerateStockMediaOutputSchema,
  },
  async (input: GenerateStockMediaInput) => {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("User must be authenticated to generate media.");
    }

    const promptText = `Photorealistic stock photo: ${input.prompt}. High quality, professional, clean, for commercial use.`;

    const generationResults = await Promise.all(
      Array.from({ length: 4 }, async (_, i) => {
        const response: any = await generateImageWithProvider({
          messages: [{ role: 'user', content: [{ text: promptText }] }],
        });

        let generatedUrl = '';
        const media = response?.media;
        if (typeof media?.url === 'string') {
          generatedUrl = media.url;
        } else if (Array.isArray(media) && typeof media[0]?.url === 'string') {
          generatedUrl = media[0].url;
        } else {
          const text = response?.result?.content?.[0]?.text || '';
          if (typeof text === 'string' && text.startsWith('Image generated: ')) {
            generatedUrl = text.replace('Image generated: ', '').trim();
          }
        }

        if (!generatedUrl) {
          throw new Error(`Image generation failed for item ${i + 1}.`);
        }

        const { publicUrl, sizeMB } = await uploadToWasabi(generatedUrl, 'images');
        return {
          name: `${input.prompt.substring(0, 30)}... #${i + 1}`,
          type: 'IMAGE' as const,
          url: publicUrl,
          size: sizeMB,
          userId: session.user.id,
        };
      })
    );

    // Write all records to the database in a single transaction
    await prisma.mediaAsset.createMany({
      data: generationResults,
    });

    return {
      images: generationResults.map(d => d.url),
    };
  }
);
