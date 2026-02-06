'use server';
/**
 * @fileOverview An AI agent that generates a voice over from a script and uploads it to Wasabi.
 */

import { ai } from '@/ai/genkit';
import wav from 'wav';
import { getAvailableTTSProvider } from '@/lib/ai/api-service-manager';
import { uploadToWasabi } from '@/server/services/wasabi-service';
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

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

const generateVoiceOverFlow = ai.defineFlow(
  {
    name: 'generateVoiceOverFlow',
    inputSchema: GenerateVoiceOverInputSchema,
    outputSchema: GenerateVoiceOverOutputSchema,
  },
  async ({ script, speakers }) => {
    const ttsProvider = await getAvailableTTSProvider();
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("User must be authenticated to generate audio.");
    }

    const isMultiSpeaker = speakers && speakers.length > 1;
    let speechConfig: any = {};

    if (isMultiSpeaker) {
      speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: speakers.map(s => ({
            speaker: s.speakerId,
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: s.voice }
            }
          }))
        }
      };
    } else {
      const singleVoice = speakers?.[0]?.voice || 'Algenib';
      speechConfig = {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: singleVoice },
        },
      };
    }

    const generateResponse = await ai.generate({
      model: ttsProvider.model,
      prompt: script,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: speechConfig
      }
    });

    // Type assertion to access the media property
    const media = (generateResponse as any).media;

    if (!media) {
      throw new Error('Audio generation failed. No media was returned.');
    }

    const audioPcmBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    const audioDataUri = 'data:audio/wav;base64,' + (await toWav(audioPcmBuffer));

    // Sequential upload and DB write to prevent orphaned files
    const { publicUrl, sizeMB } = await uploadToWasabi(audioDataUri, 'audio');

    await prisma.mediaAsset.create({
      data: {
        name: `Voice Over: ${script.substring(0, 30)}...`,
        type: 'AUDIO',
        url: publicUrl,
        size: sizeMB,
        userId: session.user.id,
      }
    });

    return {
      audioUrl: publicUrl,
    };
  }
);
