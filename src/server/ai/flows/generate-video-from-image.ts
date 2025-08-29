
'use server';
/**
 * @fileOverview An AI agent that generates a video and a separate audio track from a single image.
 * This flow now uses the API service manager to rotate through available video and audio providers.
 * - generateVideoFromImage - A function that handles the video generation process.
 * - GenerateVideoFromImageInput - The input type for the generateVideoFromImage function.
 * - GenerateVideoFromImageOutput - The return type for the generateVideoFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';
import { getAvailableVideoGenerator, getAvailableTTSProvider, getAvailableTextGenerator } from '@/lib/ai/api-service-manager';
import { uploadToWasabi } from '@/server/services/wasabi-service';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';


const GenerateVideoFromImageInputSchema = z.object({
  photoUrl: z
    .string()
    .url()
    .describe(
      "A public URL to a photo to create a video from."
    ),
  musicPrompt: z.string().describe('A prompt describing the type of music to add to the video.'),
  videoDescription: z.string().describe('A description of the desired video content.'),
});
export type GenerateVideoFromImageInput = z.infer<typeof GenerateVideoFromImageInputSchema>;

const GenerateVideoFromImageOutputSchema = z.object({
  videoUrl: z.string().url().describe('The public URL of the generated video.'),
  audioUrl: z.string().url().describe('The public URL of the generated audio.'),
});
export type GenerateVideoFromImageOutput = z.infer<typeof GenerateVideoFromImageOutputSchema>;

export async function generateVideoFromImage(input: GenerateVideoFromImageInput): Promise<GenerateVideoFromImageOutput> {
  return generateVideoFromImageFlow(input);
}

const generateVideoScriptPrompt = ai.definePrompt({
  name: 'generateVideoScriptPrompt',
  input: {schema: z.object({ videoDescription: z.string() }) },
  output: {schema: z.object({ voiceoverScript: z.string().describe("A concise voiceover script (1-2 sentences) that describes the scene or adds a call-to-action.") })},
  prompt: `You are an expert video creator. Create a very short, compelling voiceover script (1-2 sentences) for a video based on the following description.

Video Description: {{{videoDescription}}}

Respond ONLY with the JSON object containing the voiceoverScript.
`,
});


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

const generateVideoFromImageFlow = ai.defineFlow(
  {
    name: 'generateVideoFromImageFlow',
    inputSchema: GenerateVideoFromImageInputSchema,
    outputSchema: GenerateVideoFromImageOutputSchema,
  },
  async input => {
    const videoGenerator = await getAvailableVideoGenerator();
    const audioGenerator = await getAvailableTTSProvider();
    const textGenerator = await getAvailableTextGenerator();
    const session = await auth();

    if (!session?.user) {
        throw new Error("User must be authenticated to generate media.");
    }

    // Step 1: Generate the voiceover script from the video description
    const { output: scriptOutput } = await textGenerator.generate(generateVideoScriptPrompt, { videoDescription: input.videoDescription });
    const voiceoverScript = scriptOutput?.voiceoverScript;
    if (!voiceoverScript) {
        throw new Error('Failed to generate voiceover script.');
    }
    
    // Step 2: Generate Video and Audio in parallel
    const [videoGenPromise, audioGenPromise] = await Promise.all([
      videoGenerator.generate({
        prompt: [
            { text: input.videoDescription }, 
            { media: { url: input.photoUrl } }
        ],
        config: {
          durationSeconds: 5,
          aspectRatio: '16:9',
        }
      }),
      audioGenerator.generate({ 
          prompt: voiceoverScript,
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Achernar' } } }
          }
      })
    ]);

    // Step 3: Poll for video completion
    let { operation } = videoGenPromise;
    if (!operation) {
        throw new Error('Expected the video model to return an operation.');
    }
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        operation = await videoGenerator.checkOperation(operation);
    }
    if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    const videoMediaPart = operation.output?.message?.content.find((p) => !!p.media);
    if (!videoMediaPart?.media) {
      throw new Error('Video generation failed. No media was returned in the final operation.');
    }

    // Step 4: Process Audio
    if (!audioGenPromise.media) {
      throw new Error('Audio generation failed. No media was returned.');
    }
    
    // Step 5: Upload assets sequentially to prevent orphaned files
    const { publicUrl: videoUrl, sizeMB: videoSize } = await uploadToWasabi(videoMediaPart.media.url, 'videos');
    await prisma.mediaAsset.create({
        data: { name: `Video: ${input.videoDescription.substring(0,30)}...`, type: 'VIDEO', url: videoUrl, size: videoSize, userId: session.user.id }
    });
    
    const audioPcmBuffer = Buffer.from(audioGenPromise.media.url.substring(audioGenPromise.media.url.indexOf(',') + 1), 'base64');
    const audioDataUri = 'data:audio/wav;base64,' + (await toWav(audioPcmBuffer));
    const { publicUrl: audioUrl, sizeMB: audioSize } = await uploadToWasabi(audioDataUri, 'audio');
    await prisma.mediaAsset.create({
        data: { name: `Audio: ${input.musicPrompt.substring(0,30)}...`, type: 'AUDIO', url: audioUrl, size: audioSize, userId: session.user.id }
    });


    return {
      videoUrl,
      audioUrl,
    };
  }
);

    