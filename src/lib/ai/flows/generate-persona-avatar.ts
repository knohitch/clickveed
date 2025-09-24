

'use server';
/**
 * @fileOverview An AI agent that generates a talking avatar video based on a persona and script.
 *
 * - generatePersonaAvatar - A function that handles the avatar video generation process.
 * - GeneratePersonaAvatarInput - The input type for the function.
 * - GeneratePersonaAvatarOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getAvailableVideoGenerator, generateVideoWithProvider, generateImageWithProvider } from '@/lib/ai/api-service-manager';
import { uploadToWasabi } from '@/server/services/wasabi-service';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

const GeneratePersonaAvatarInputSchema = z.object({
  personaName: z.string().describe('The name of the AI persona.'),
  personaDescription: z
    .string()
    .describe('A detailed description of the persona including their personality, expertise, and communication style.'),
  avatarDescription: z
    .string()
    .describe('A detailed visual description of the avatar to be generated.'),
  script: z
    .string()
    .describe('The script the avatar should speak in the video.')
});
export type GeneratePersonaAvatarInput = z.infer<typeof GeneratePersonaAvatarInputSchema>;

const GeneratePersonaAvatarOutputSchema = z.object({
  avatarImageUrl: z.string().url().describe('The public URL of the generated avatar image.'),
  videoStatus: z.string().describe("A status message about the video generation process.")
});
export type GeneratePersonaAvatarOutput = z.infer<typeof GeneratePersonaAvatarOutputSchema>;

export async function generatePersonaAvatar(
  input: GeneratePersonaAvatarInput
): Promise<GeneratePersonaAvatarOutput> {
  return generatePersonaAvatarFlow(input);
}


async function generateVideoInBackground(userId: string, personaName: string, avatarImageDataUri: string, script: string) {
    try {
        const providerInfo = await getAvailableVideoGenerator();
        const videoPrompt = [
            { text: `Animate this avatar to speak the following script in a natural way. Script: "${script}"` },
            { media: { url: avatarImageDataUri } }
        ];

        const result = await ai.generate({
            model: providerInfo.model,
            prompt: videoPrompt,
            config: {
                durationSeconds: 8,
                aspectRatio: '16:9',
                personGeneration: 'allow_adult',
            }
        });

        if (!result.output?.message?.content) {
            throw new Error('Video generation failed. No content was returned.');
        }

        const videoMediaContent = result.output.message.content.find((p: any) => !!p.media);
        if (!videoMediaContent?.media) {
            throw new Error('Video generation failed. No media was returned in the final operation.');
        }

        const { publicUrl, sizeMB } = await uploadToWasabi(videoMediaContent.media.url, 'videos');

        await prisma.mediaAsset.create({
            data: {
                name: `Avatar Video: ${personaName}`,
                type: 'VIDEO',
                url: publicUrl,
                size: sizeMB,
                userId: userId,
            }
        });
        console.log(`Successfully generated and saved video for persona ${personaName}`);
    } catch (error) {
        console.error(`Background video generation failed for ${personaName}:`, error);
    }
}


const generatePersonaAvatarFlow = ai.defineFlow(
  {
    name: 'generatePersonaAvatarFlow',
    inputSchema: GeneratePersonaAvatarInputSchema,
    outputSchema: GeneratePersonaAvatarOutputSchema,
  },
  async (input) => {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error("User must be authenticated to generate an avatar.");
    }

    // Step 1: Generate the static avatar image first and return it immediately.
    const imageResult = await generateImageWithProvider({
        messages: [{ role: 'user', content: [{ text: input.avatarDescription }] }],
        config: { responseModalities: ['TEXT', 'IMAGE'] }
    });

    if (!imageResult.output?.message?.content) {
        throw new Error("Failed to generate the initial avatar image.");
    }

    const imageMediaContent = imageResult.output.message.content.find((p: any) => !!p.media);
    if (!imageMediaContent?.media) {
        throw new Error("Failed to generate the initial avatar image - no media returned.");
    }

    const avatarImageDataUri = imageMediaContent.media.url;
    
    // Sequential upload and DB write to prevent orphaned files
    const { publicUrl: avatarImageUrl, sizeMB: avatarImageSize } = await uploadToWasabi(avatarImageDataUri, 'images');
    await prisma.mediaAsset.create({
        data: {
            name: `Avatar Image: ${input.personaName}`,
            type: 'IMAGE',
            url: avatarImageUrl,
            size: avatarImageSize,
            userId: session.user.id,
        }
    });

    // Step 2: Trigger the video generation in the background without waiting for it.
    generateVideoInBackground(session.user.id, input.personaName, avatarImageDataUri, input.script);

    return {
      avatarImageUrl,
      videoStatus: 'Video generation has started.',
    };
  }
);
