
'use server';
/**
 * @fileOverview An AI agent that removes the background from an image and uploads it.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getAvailableImageGenerator } from '@/lib/ai/api-service-manager';
import { uploadToWasabi } from '@/server/services/wasabi-service';
import prisma from '@/server/prisma';
import { auth } from '@/auth';

const RemoveImageBackgroundInputSchema = z.object({
  imageUrl: z
    .string()
    .url()
    .describe(
      "The public URL of the image to process."
    ),
});
export type RemoveImageBackgroundInput = z.infer<typeof RemoveImageBackgroundInputSchema>;

const RemoveImageBackgroundOutputSchema = z.object({
  imageUrl: z.string().url().describe('The public URL of the image with the background removed.'),
});
export type RemoveImageBackgroundOutput = z.infer<typeof RemoveImageBackgroundOutputSchema>;

export async function removeImageBackground(
  input: RemoveImageBackgroundInput
): Promise<RemoveImageBackgroundOutput> {
  return removeImageBackgroundFlow(input);
}

const removeImageBackgroundFlow = ai.defineFlow(
  {
    name: 'removeImageBackgroundFlow',
    inputSchema: RemoveImageBackgroundInputSchema,
    outputSchema: RemoveImageBackgroundOutputSchema,
  },
  async (input) => {
    const session = await auth();

    if (!session?.user) {
        throw new Error("User must be authenticated to process images.");
    }

    // This is a simulation using a generative model. A real implementation would use
    // a more specialized image segmentation model for this task for better accuracy.
    const imageGenerator = await getAvailableImageGenerator();
    
    // We need to fetch the image data first to pass it as a data URI to the model
    const imageResponse = await fetch(input.imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const dataUri = `data:${contentType};base64,${Buffer.from(imageBuffer).toString('base64')}`;

    const generateResponse = await ai.generate({
      model: imageGenerator.model,
      prompt: `Please remove the background from this image. The subject should be perfectly isolated with a transparent background. Image: {{media url=dataUri}}`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });
    
    // Type assertion to access the media property
    const media = (generateResponse as any).media;

    if (!media || !media[0]?.url) {
      throw new Error('Image processing failed. No media was returned.');
    }
    
    // Sequential upload and DB write to prevent orphaned files
    const { publicUrl, sizeMB } = await uploadToWasabi(media[0].url, 'images');
    await prisma.mediaAsset.create({
        data: {
            name: `Background Removed Image #${Math.floor(Math.random() * 1000)}`,
            type: 'IMAGE',
            url: publicUrl,
            size: sizeMB,
            userId: session.user.id,
        }
    });

    return {
      imageUrl: publicUrl,
    };
  }
);
