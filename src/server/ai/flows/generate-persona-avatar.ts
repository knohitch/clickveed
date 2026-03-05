'use server';
/**
 * @fileOverview An AI agent that generates a talking avatar video based on a persona and script.
 */

import { ai } from '@/ai/genkit';
import { generateImageWithProvider, generateVideoWithProvider } from '@/lib/ai/api-service-manager';
import { uploadToWasabi } from '@/server/services/wasabi-service';
import prisma from '@/server/prisma';
import { auth } from '@/auth';
import {
  GeneratePersonaAvatarInputSchema,
  GeneratePersonaAvatarOutputSchema,
  type GeneratePersonaAvatarInput,
  type GeneratePersonaAvatarOutput,
} from './types';

// Re-export types for consumers
export type { GeneratePersonaAvatarInput, GeneratePersonaAvatarOutput } from './types';

/**
 * Robustly extracts an image URL or data URI from the various response shapes
 * that generateImageWithProvider can return:
 *  - Custom providers  → result.content[0].text = "Image generated: <url>"
 *  - Genkit/Gemini     → media.url  (single object, NOT an array)
 *  - Genkit/Gemini     → message.content[N].media.url
 *  - Genkit/Gemini     → message.content[N].inlineData.data  (base64)
 *  - Raw Google API    → custom.candidates[0].content.parts[N].inlineData.data
 */
function extractAvatarImageUrl(imageResponse: unknown): string {
  const payload = imageResponse as any;

  // Custom providers return "Image generated: <url>"
  const text = payload?.result?.content?.[0]?.text;
  if (typeof text === 'string' && text.startsWith('Image generated: ')) {
    return text.replace('Image generated: ', '').trim();
  }

  // Genkit GenerateResponse: response.media.url (single object, NOT array)
  if (typeof payload?.media?.url === 'string' && payload.media.url.length > 0) {
    return payload.media.url;
  }

  // Backward-compat: response.media as array
  if (Array.isArray(payload?.media) && typeof payload.media[0]?.url === 'string') {
    return payload.media[0].url;
  }

  // Message content parts (URL or inline base64)
  const messageParts = payload?.message?.content;
  if (Array.isArray(messageParts)) {
    for (const part of messageParts) {
      if (typeof part?.media?.url === 'string' && part.media.url.length > 0) {
        return part.media.url;
      }
      if (typeof part?.inlineData?.data === 'string' && part.inlineData.data.length > 0) {
        const mime = part.inlineData.mimeType || 'image/png';
        return `data:${mime};base64,${part.inlineData.data.replace(/\s+/g, '')}`;
      }
    }
  }

  // Raw Google API nested response (custom.candidates[0].content.parts)
  const customParts = payload?.custom?.candidates?.[0]?.content?.parts;
  if (Array.isArray(customParts)) {
    for (const part of customParts) {
      if (typeof part?.inlineData?.data === 'string' && part.inlineData.data.length > 0) {
        const mime = part.inlineData.mimeType || 'image/png';
        return `data:${mime};base64,${part.inlineData.data.replace(/\s+/g, '')}`;
      }
      if (typeof part?.fileData?.fileUri === 'string' && part.fileData.fileUri.length > 0) {
        return part.fileData.fileUri;
      }
    }
  }

  return '';
}

export async function generatePersonaAvatar(
  input: GeneratePersonaAvatarInput
): Promise<GeneratePersonaAvatarOutput> {
  return generatePersonaAvatarFlow(input);
}

async function generateVideoInBackground(userId: string, personaName: string, avatarImageDataUri: string, script: string) {
  try {
    const response: any = await generateVideoWithProvider({
      messages: [{ role: 'user', content: [{ text: `Animate this avatar to speak naturally. Script: "${script}". Avatar: ${avatarImageDataUri}` }] }],
    });
    const responseText = response?.result?.content?.[0]?.text || '';
    const generatedVideoUrl = responseText.replace('Video generated: ', '').trim();
    if (!generatedVideoUrl) {
      throw new Error('Video generation failed. No video URL returned by provider.');
    }

    const { publicUrl, sizeMB } = await uploadToWasabi(generatedVideoUrl, 'videos');

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
    // Use generateImageWithProvider() which creates a properly configured Genkit
    // instance with API keys loaded from the database, avoiding the plugin-less
    // default ai instance which causes "Model not found" errors.
    const imageMessages = [{ role: 'user' as const, content: [{ text: input.avatarDescription }] }];
    const imageResponse = await generateImageWithProvider({ messages: imageMessages });

    // Extract image URL/data-URI from response using the robust multi-shape extractor.
    const avatarImageDataUri = extractAvatarImageUrl(imageResponse);

    if (!avatarImageDataUri) {
      const provider = (imageResponse as any)?.provider || 'unknown';
      const model = (imageResponse as any)?.model || 'unknown';
      throw new Error(
        `Failed to generate the initial avatar image. No media returned by provider=${provider} model=${model}. ` +
        `Ensure a valid image provider (Gemini API key or Imagen/Replicate credentials) is configured in admin settings.`
      );
    }

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
