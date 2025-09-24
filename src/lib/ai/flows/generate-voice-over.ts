'use server';
/**
 * @fileOverview An AI agent that generates a voice over from a script and uploads it to Wasabi.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';
import { getAvailableTTSProvider } from '@/lib/ai/api-service-manager';
import { uploadToWasabi } from '@/server/services/wasabi-service';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

const SpeakerSchema = z.object({
  speakerId: z.string().describe('The identifier for the speaker, e.g., "Speaker1"'),
  voice: z.string().describe('The pre-built voice to use for this speaker.'),
});

const GenerateVoiceOverInputSchema = z.object({
  script: z
    .string()
    .describe('The text script to be converted into a voice over. For multi-speaker, use format like "Speaker1: text. Speaker2: more text."'),
  speakers: z.array(SpeakerSchema).optional().describe('An array of speakers and their assigned voices for multi-speaker generation.'),
});
export type GenerateVoiceOverInput = z.infer<typeof GenerateVoiceOverInputSchema>;

const GenerateVoiceOverOutputSchema = z.object({
  audioUrl: z.string().url().describe('The public URL of the generated audio file.'),
});
export type GenerateVoiceOverOutput = z.infer<typeof GenerateVoiceOverOutputSchema>;

export async function generateVoiceOver(
  input: GenerateVoiceOverInput
): Promise<GenerateVoiceOverOutput> {
  return generateVoiceOverFlow(input);
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
  async ({script, speakers}) => {
    const ttsProviderInfo = await getAvailableTTSProvider();
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
    
    // Use the ai.generate function directly with the correct model
    const {media} = await ai.generate({
      model: ttsProviderInfo.model,
      prompt: script,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: speechConfig
      }
    });

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
