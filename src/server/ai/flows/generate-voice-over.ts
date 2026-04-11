'use server';
/**
 * @fileOverview An AI agent that generates a voice over from a script and uploads it to Wasabi.
 */

import { ai } from '@/ai/genkit';
import { generateTtsWithProvider } from '@/lib/ai/api-service-manager';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import prisma from '@/server/prisma';
import { auth } from '@/auth';
import { uploadToWasabi } from '@/server/services/wasabi-service';
import { extractAudioUrl, parseMultiSpeakerScript, type VoiceSegment } from '@/server/ai/workflow-contract-helpers';
import {
  GenerateVoiceOverInputSchema,
  GenerateVoiceOverOutputSchema,
  type GenerateVoiceOverInput,
  type GenerateVoiceOverOutput,
} from './types';

// Re-export types for consumers
export type { GenerateVoiceOverInput, GenerateVoiceOverOutput } from './types';

const AUDIO_HEAD_TIMEOUT_MS = 5000;
const AUDIO_FETCH_TIMEOUT_MS = 15000;

async function fetchAudioBuffer(audioUrl: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetchWithTimeout(
    audioUrl,
    { cache: 'no-store' },
    AUDIO_FETCH_TIMEOUT_MS,
    `Generated audio download timed out after ${AUDIO_FETCH_TIMEOUT_MS}ms.`
  );
  if (!response.ok) {
    throw new Error(`Generated audio URL is not accessible (${response.status}).`);
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.startsWith('audio/')) {
    throw new Error(`Generated audio has invalid content-type: ${contentType || 'unknown'}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length <= 1024) {
    throw new Error('Generated audio file is too small or empty.');
  }

  return { buffer, contentType };
}

function stripLeadingMp3Metadata(buffer: Buffer): Buffer {
  let offset = 0;

  if (buffer.length >= 10 && buffer.subarray(0, 3).toString('ascii') === 'ID3') {
    const size =
      ((buffer[6] & 0x7f) << 21) |
      ((buffer[7] & 0x7f) << 14) |
      ((buffer[8] & 0x7f) << 7) |
      (buffer[9] & 0x7f);
    offset = 10 + size;
  }

  for (let index = offset; index < buffer.length - 1; index += 1) {
    if (buffer[index] === 0xff && (buffer[index + 1] & 0xe0) === 0xe0) {
      return buffer.subarray(index);
    }
  }

  return buffer.subarray(offset);
}

async function synthesizeSegmentAudio(text: string, voiceId?: string): Promise<string> {
  const ttsMessages = [{ role: 'user' as const, content: [{ text }] }];
  const ttsResponse = await generateTtsWithProvider({
    messages: ttsMessages,
    voiceId,
  });

  const audioUrl = extractAudioUrl(ttsResponse);
  if (!audioUrl) {
    throw new Error('Audio generation failed. No audio URL was returned from the TTS provider.');
  }

  await assertPlayableAudioUrl(audioUrl);
  return audioUrl;
}

async function assertPlayableAudioUrl(audioUrl: string): Promise<void> {
  const headResponse = await fetchWithTimeout(
    audioUrl,
    { method: 'HEAD', cache: 'no-store' },
    AUDIO_HEAD_TIMEOUT_MS,
    `Generated audio validation HEAD request timed out after ${AUDIO_HEAD_TIMEOUT_MS}ms.`
  ).catch(() => null);
  const headType = (headResponse?.headers.get('content-type') || '').toLowerCase();
  const headLength = Number(headResponse?.headers.get('content-length') || '0');

  if (headResponse?.ok && headType.startsWith('audio/') && headLength > 1024) {
    return;
  }

  const getResponse = await fetchWithTimeout(
    audioUrl,
    { cache: 'no-store' },
    AUDIO_FETCH_TIMEOUT_MS,
    `Generated audio validation download timed out after ${AUDIO_FETCH_TIMEOUT_MS}ms.`
  );
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

export async function runVoiceOverWorkflow(
  input: GenerateVoiceOverInput,
  deps: {
    userId: string;
    synthesizeSegmentAudio: (text: string, voiceId?: string) => Promise<string>;
    fetchAudioBuffer: typeof fetchAudioBuffer;
    uploadCombinedAudio: (dataUri: string) => Promise<{ publicUrl: string; sizeMB: number }>;
    persistAudio: (mediaSource: string) => Promise<{ publicUrl: string; sizeMB: number }>;
    assertPlayableAudioUrl: (audioUrl: string) => Promise<void>;
    createMediaAsset: (asset: { name: string; type: 'AUDIO'; url: string; size: number; userId: string }) => Promise<unknown>;
  }
): Promise<GenerateVoiceOverOutput> {
  const availableSpeakers = input.speakers?.filter((speaker) => speaker.voice?.trim()) || [];
  const hasMultipleVoices = availableSpeakers.length > 1;

  let audioUrl: string;
  let sizeMB = 0;

  if (hasMultipleVoices) {
    const segments = parseMultiSpeakerScript(input.script, availableSpeakers);
    const segmentBuffers: Buffer[] = [];

    for (const [index, segment] of segments.entries()) {
      const segmentAudioUrl = await deps.synthesizeSegmentAudio(segment.text, segment.voice);
      const { buffer, contentType } = await deps.fetchAudioBuffer(segmentAudioUrl);

      if (!contentType.includes('mpeg') && !contentType.includes('mp3')) {
        throw new Error(
          `Multi-speaker stitching currently requires MP3 output, but segment ${index + 1} returned ${contentType}.`
        );
      }

      segmentBuffers.push(index === 0 ? buffer : stripLeadingMp3Metadata(buffer));
    }

    const stitchedAudio = Buffer.concat(segmentBuffers);
    const uploaded = await deps.uploadCombinedAudio(
      `data:audio/mpeg;base64,${stitchedAudio.toString('base64')}`
    );

    audioUrl = uploaded.publicUrl;
    sizeMB = uploaded.sizeMB;
    await deps.assertPlayableAudioUrl(audioUrl);
  } else {
    const selectedVoice = availableSpeakers[0]?.voice?.trim();
    const providerAudioUrl = await deps.synthesizeSegmentAudio(input.script, selectedVoice);
    const persistedAudio = await deps.persistAudio(providerAudioUrl);
    audioUrl = persistedAudio.publicUrl;
    sizeMB = persistedAudio.sizeMB;
    await deps.assertPlayableAudioUrl(audioUrl);
  }

  await deps.createMediaAsset({
    name: `Voice Over: ${input.script.substring(0, 30)}...`,
    type: 'AUDIO',
    url: audioUrl,
    size: sizeMB,
    userId: deps.userId,
  });

  return {
    audioUrl,
  };
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
    return runVoiceOverWorkflow(
      { script, speakers },
      {
        userId: session.user.id,
        synthesizeSegmentAudio,
        fetchAudioBuffer,
        uploadCombinedAudio: async (dataUri) => uploadToWasabi(dataUri, 'audio'),
        persistAudio: async (mediaSource) => uploadToWasabi(mediaSource, 'audio'),
        assertPlayableAudioUrl,
        createMediaAsset: async (asset) => prisma.mediaAsset.create({ data: asset }),
      }
    );
  }
);
