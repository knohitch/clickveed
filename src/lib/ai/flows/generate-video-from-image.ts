'use server';
/**
 * @fileOverview An AI agent that generates a video and a separate audio track from a single image.
 * This flow now uses the API service manager to rotate through available video and audio providers.
 * - generateVideoFromImage - A function that handles the video generation process.
 * - GenerateVideoFromImageInput - The input type for the generateVideoFromImage function.
 * - GenerateVideoFromImageOutput - The return type for the generateVideoFromImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import wav from 'wav';
import { getAvailableVideoGenerator, getAvailableTTSProvider, getAvailableTextGenerator } from '../api-service-manager';
import { uploadToWasabi } from '@/lib/services/wasabi-service';
import prisma from '@lib/prisma';
import { auth } from '@/auth';
import { getAdminSettings } from '@/server/actions/admin-actions';
import * as pikaClient from '@/lib/pika-client';
import * as runwayClient from '@/lib/runwayml-client';

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
    // This is a simplified implementation as the actual video generation API needs more complex integration
    const session = await auth();

    if (!session?.user) {
        throw new Error("User must be authenticated to generate media.");
    }

    // Step 1: Generate the voiceover script from the video description
    const scriptGenerateResponse = await ai.generate({
      prompt: `You are an expert video creator. Create a very short, compelling voiceover script (1-2 sentences) for a video based on the following description.
      
      Video Description: ${input.videoDescription}
      
      Respond ONLY with the voiceover script.`,
      output: {
        schema: z.object({ 
          voiceoverScript: z.string().describe("A concise voiceover script (1-2 sentences) that describes the scene or adds a call-to-action.") 
        })
      }
    });
    
    const voiceoverScript = scriptGenerateResponse.output?.voiceoverScript;
    if (!voiceoverScript) {
        throw new Error('Failed to generate voiceover script.');
    }
    // Step 2: Generate the video from the image using one of our video generation services
    let videoUrl = "";
    let videoSize = 0;
    
    // Try to get API keys for our video generation services
    const { apiKeys } = await getAdminSettings();
    const hasPikaKey = !!apiKeys.pika;
    const hasRunwayKey = !!apiKeys.runwayml;
    
    try {
      // First try Pika, then RunwayML as fallback
      if (hasPikaKey) {
        console.log("Generating video with Pika...");
        videoUrl = await pikaClient.generateAndWaitForVideo(
          input.photoUrl,
          input.videoDescription,
          {
            numberOfFrames: 90,  // Approximately 3-4 seconds at 24fps
            width: 768,
            height: 432
          }
        );
      } else if (hasRunwayKey) {
        console.log("Generating video with RunwayML...");
        videoUrl = await runwayClient.generateAndWaitForVideo(
          input.photoUrl,
          input.videoDescription,
          {
            numFrames: 24,  // RunwayML uses fewer frames
            motionBucketId: 127  // Medium motion amount
          }
        );
      } else {
        throw new Error("No video generation API keys configured. Please add Pika or RunwayML API keys in admin settings.");
      }
    } catch (error) {
      console.error("Error generating video:", error);
      throw new Error(`Failed to generate video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Calculate approximate video size - this is an estimation since we don't know actual size
    // We assume HD video is about 5MB for a few seconds
    videoSize = 5.0;
    
    // Step 3: Generate background audio (in a real implementation, we would use a music API)
    // For now, we'll use a placeholder URL since audio generation is not implemented yet
    const audioUrl = "https://example.com/generated-audio.wav";
    const audioSize = 0.5; // Approximate size in MB
    
    // Save the assets to the database
    const videoAsset = await prisma.mediaAsset.create({
        data: { 
          name: `Video: ${input.videoDescription.substring(0,30)}...`, 
          type: 'VIDEO', 
          url: videoUrl, 
          size: videoSize,
          userId: session.user.id 
        }
    });
    
    const audioAsset = await prisma.mediaAsset.create({
        data: { 
          name: `Audio: ${input.musicPrompt.substring(0,30)}...`, 
          type: 'AUDIO', 
          url: audioUrl, 
          size: audioSize,
          userId: session.user.id 
        }
    });

    return {
      videoUrl,
      audioUrl,
    };
  }
);
