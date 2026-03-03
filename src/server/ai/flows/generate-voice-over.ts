'use server';
/**
 * @fileOverview An AI agent that generates a voice over from a script and uploads it to Wasabi.
 */

import { ai } from '@/ai/genkit';
import { generateTtsWithProvider } from '@/lib/ai/api-service-manager';
import prisma from '@/server/prisma';
import { auth } from '@/auth';
import {
  GenerateVoiceOverInputSchema,
  GenerateVoiceOverOutputSchema,
  type GenerateVoiceOverInput,
  type GenerateVoiceOverOutput,
} from './types';

// Re-export types for consumers
export type { GenerateVoiceOverInput, GenerateVoiceOverOutput } from './types';

async function assertPlayableAudioUrl(audioUrl: string): Promise<void> {
  const headResponse = await fetch(audioUrl, { method: 'HEAD' }).catch(() => null);
  const headType = (headResponse?.headers.get('content-type') || '').toLowerCase();
  const headLength = Number(headResponse?.headers.get('content-length') || '0');

  if (headResponse?.ok && headType.startsWith('audio/') && headLength > 1024) {
    return;
  }

  const getResponse = await fetch(audioUrl);
  if (!getResponse.ok) {
    throw new Error(`Generated audio URL is not accessible (${getResponse.status}).`);
  }

  const getType = (getResponse.headers.get('content-type') || '').toLowerCase();
  const bytes = Buffer.from(await getResponse.arrayBuffer());

  if (!getType.startsWith('audio/')) {
    throw new Error(`Generated audio has invalid content-type: ${getType || 'unknown'}`);
  }

  if (bytes.length <= 1024) {
    throw new Error('Generated audio file is too small or empty.');
  }
}

export async function generateVoiceOver(
  input: GenerateVoiceOverInput
): Promise<GenerateVoiceOverOutput> {
  try {
    return await generateVoiceOverFlow(input);
  } catch (error) {
    console.error('Voice over generation failed:', error);
    throw new Error(`Voice over generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


const generateVoiceOverFlow = ai.defineFlow(
  {
    name: 'generateVoiceOverFlow',
    inputSchema: GenerateVoiceOverInputSchema,
    outputSchema: GenerateVoiceOverOutputSchema,
  },
  async ({ script, speakers }) => {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("User must be authenticated to generate audio.");
    }

    // generateTtsWithProvider() routes to Minimax (primary) with ElevenLabs fallback.
    // This avoids using the plugin-less default ai instance and the non-existent
    // 'googleai/gemini-1.5-flash-tts' model that caused NOT_FOUND errors.
    const ttsMessages = [{ role: 'user' as const, content: [{ text: script }] }];

    const ttsResponse = await generateTtsWithProvider({ messages: ttsMessages });

    // ElevenLabs and other custom providers return { result: { content: [{ text: "Speech generated: <url>" }] } }
    // The audioUrl is embedded in the response text from ElevenLabs client
    const responseText = (ttsResponse as any).result?.content?.[0]?.text || '';
    let audioUrl = responseText.replace('Speech generated: ', '').trim();

    if (!audioUrl || !audioUrl.startsWith('http')) {
      // Fallback: check if result contains a direct audioUrl property
      audioUrl = (ttsResponse as any).audioUrl || '';
    }

    // Normalize protocol-less absolute URLs without hardcoding provider domains.
    const isLikelyAbsoluteHostPath = /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(audioUrl);
    if (audioUrl && !audioUrl.startsWith('http') && isLikelyAbsoluteHostPath) {
      audioUrl = `https://${audioUrl.replace(/^\/+/, '')}`;
    }

    if (!audioUrl) {
      throw new Error('Audio generation failed. No audio URL was returned from the TTS provider.');
    }

    // Prevent false "success" states with empty/invalid audio files.
    await assertPlayableAudioUrl(audioUrl);

    await prisma.mediaAsset.create({
      data: {
        name: `Voice Over: ${script.substring(0, 30)}...`,
        type: 'AUDIO',
        url: audioUrl,
        size: 0, // Size not available from URL-based response
        userId: session.user.id,
      }
    });

    return {
      audioUrl,
    };
  }
);
