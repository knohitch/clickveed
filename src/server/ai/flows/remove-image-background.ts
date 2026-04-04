'use server';
/**
 * @fileOverview An AI agent that removes the background from an image and uploads it.
 */

import { ai } from '@/ai/genkit';
import { generateImageEditWithProvider } from '@/lib/ai/api-service-manager';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { uploadToWasabi } from '@/server/services/wasabi-service';
import prisma from '@/server/prisma';
import { auth } from '@/auth';
import {
  RemoveImageBackgroundInputSchema,
  RemoveImageBackgroundOutputSchema,
  type RemoveImageBackgroundInput,
  type RemoveImageBackgroundOutput,
} from './types';

// Re-export types for consumers
export type { RemoveImageBackgroundInput, RemoveImageBackgroundOutput } from './types';

const SOURCE_IMAGE_FETCH_TIMEOUT_MS = 15000;

export async function removeImageBackground(
  input: RemoveImageBackgroundInput
): Promise<RemoveImageBackgroundOutput> {
  return removeImageBackgroundFlow(input);
}

function extractImageLikeText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const dataUriMatch = trimmed.match(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+/i);
  if (dataUriMatch?.[0]) {
    return dataUriMatch[0].replace(/\s+/g, '');
  }

  const urlMatch = trimmed.match(/https?:\/\/[^\s"'`<>]+/i);
  if (urlMatch?.[0]) {
    return urlMatch[0];
  }

  return '';
}

function toImageDataUri(mimeType: string | undefined, base64Data: string): string {
  const cleanedData = String(base64Data || '').replace(/\s+/g, '');
  if (!cleanedData) return '';
  const normalizedMime = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/png';
  return `data:${normalizedMime};base64,${cleanedData}`;
}

function extractImageFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) return '';

  for (const part of parts as any[]) {
    if (typeof part?.media?.url === 'string') {
      return part.media.url;
    }
    if (typeof part?.inlineData?.data === 'string') {
      const dataUri = toImageDataUri(part?.inlineData?.mimeType, part.inlineData.data);
      if (dataUri) return dataUri;
    }
    if (typeof part?.fileData?.fileUri === 'string') {
      return part.fileData.fileUri;
    }
    if (typeof part?.text === 'string') {
      const extracted = extractImageLikeText(part.text);
      if (extracted) return extracted;
    }
  }

  return '';
}

function extractImageFromCustomPayload(node: unknown, depth = 0): string {
  if (!node || depth > 7) return '';

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = extractImageFromCustomPayload(item, depth + 1);
      if (found) return found;
    }
    return '';
  }

  if (typeof node !== 'object') return '';
  const obj = node as Record<string, any>;

  if (typeof obj?.inlineData?.data === 'string') {
    const dataUri = toImageDataUri(obj?.inlineData?.mimeType, obj.inlineData.data);
    if (dataUri) return dataUri;
  }

  if (typeof obj?.bytesBase64Encoded === 'string') {
    const dataUri = toImageDataUri(obj?.mimeType, obj.bytesBase64Encoded);
    if (dataUri) return dataUri;
  }

  if (typeof obj?.fileData?.fileUri === 'string') {
    return obj.fileData.fileUri;
  }

  const fromParts =
    extractImageFromParts(obj?.parts) ||
    extractImageFromParts(obj?.content?.parts) ||
    extractImageFromParts(obj?.candidates?.[0]?.content?.parts) ||
    extractImageFromParts(obj?.response?.candidates?.[0]?.content?.parts);
  if (fromParts) return fromParts;

  for (const value of Object.values(obj)) {
    const found = extractImageFromCustomPayload(value, depth + 1);
    if (found) return found;
  }

  return '';
}

function extractImageUrlFromGenerateResponse(response: unknown): string {
  const payload = response as any;

  // Genkit GenerateResponse getter shape: response.media.url
  if (typeof payload?.media?.url === 'string') {
    return payload.media.url;
  }

  // Backward-compat shape used in some older code paths.
  if (Array.isArray(payload?.media) && typeof payload.media[0]?.url === 'string') {
    return payload.media[0].url;
  }

  // Parse message/content parts directly when available.
  const messageParts = payload?.message?.content;
  if (Array.isArray(messageParts)) {
    const extracted = extractImageFromParts(messageParts);
    if (extracted) return extracted;
  }

  const resultParts = payload?.result?.content;
  if (Array.isArray(resultParts)) {
    const extracted = extractImageFromParts(resultParts);
    if (extracted) return extracted;
  }

  // Custom providers return "Image generated: <url>" text.
  const text = payload?.result?.content?.[0]?.text;
  if (typeof text === 'string' && text.startsWith('Image generated: ')) {
    return text.replace('Image generated: ', '').trim();
  }

  if (typeof payload?.text === 'string') {
    const extracted = extractImageLikeText(payload.text);
    if (extracted) {
      return extracted;
    }
  }

  const customExtracted = extractImageFromCustomPayload(payload?.custom);
  if (customExtracted) {
    return customExtracted;
  }

  return '';
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

    // We need to fetch the image data first to pass it as a data URI to the model
    const imageResponse = await fetchWithTimeout(
      input.imageUrl,
      { cache: 'no-store' },
      SOURCE_IMAGE_FETCH_TIMEOUT_MS,
      `Source image download timed out after ${SOURCE_IMAGE_FETCH_TIMEOUT_MS}ms.`
    );
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const dataUri = `data:${contentType};base64,${Buffer.from(imageBuffer).toString('base64')}`;

    const generateResponse = await generateImageEditWithProvider({
      prompt: 'Please remove the background from this image. The subject should be perfectly isolated with a transparent background.',
      imageDataUri: dataUri,
    });

    const processedImageUrl = extractImageUrlFromGenerateResponse(generateResponse);
    if (!processedImageUrl) {
      const provider = (generateResponse as any)?.provider || 'unknown';
      const model = (generateResponse as any)?.model || 'unknown';
      const finishReason = (generateResponse as any)?.finishReason || 'unknown';
      const previewText =
        (generateResponse as any)?.text ||
        (generateResponse as any)?.message?.content?.find((part: any) => typeof part?.text === 'string')?.text ||
        '';
      throw new Error(
        `Image processing failed. No media was returned. provider=${provider} model=${model} finishReason=${finishReason} textPreview=${String(previewText).slice(0, 180)}`
      );
    }

    // Sequential upload and DB write to prevent orphaned files
    const { publicUrl, sizeMB } = await uploadToWasabi(processedImageUrl, 'images');
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
