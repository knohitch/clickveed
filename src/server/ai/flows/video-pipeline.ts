
'use server';
/**
 * @fileOverview A collection of AI functions to power the multi-step video creation pipeline.
 * Each function represents a distinct step in the workflow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';
import { getAvailableTTSProvider, getAvailableTextGenerator, getAvailableVideoGenerator } from '@/lib/ai/api-service-manager';
import { uploadToWasabi } from '@/server/services/wasabi-service';
import prisma from '@/server/prisma';
import { auth } from '@/auth';

// STEP 1: SCRIPT GENERATION =================================================

const GeneratePipelineScriptInputSchema = z.object({
  prompt: z.string().describe('The core topic or idea for the video script.'),
  videoType: z.string().describe('The type or format of the video (e.g., "Commercial", "Explainer", "Social Media Ad").'),
  tone: z.string().describe('The desired tone of the video (e.g., "Humorous", "Formal", "Inspirational").'),
  duration: z.string().describe('The target duration of the video (e.g., "30 seconds", "2 minutes").'),
});
export type GeneratePipelineScriptInput = z.infer<typeof GeneratePipelineScriptInputSchema>;

const GeneratePipelineScriptOutputSchema = z.object({
  script: z.string().describe('The generated video script, formatted and ready for production.'),
});
export type GeneratePipelineScriptOutput = z.infer<typeof GeneratePipelineScriptOutputSchema>;

export async function generatePipelineScript(input: GeneratePipelineScriptInput): Promise<GeneratePipelineScriptOutput> {
  const prompt = `You are an expert AI video scriptwriter. Your task is to generate a compelling and well-structured video script based on the user's requirements.

  Pay close attention to all the details provided:

  - **Core Idea:** ${input.prompt}
  - **Video Type:** ${input.videoType}
  - **Desired Tone:** ${input.tone}
  - **Target Duration:** ${input.duration}

  Based on this, create a complete script. The script should include scene descriptions (like "[SCENE: A programmer's desk with code on screen]"), dialogue/voiceover, and camera/action cues where appropriate. Ensure the final script is plausible for the specified duration.`;

  const {output} = await ai.generate({
    prompt,
    output: {schema: GeneratePipelineScriptOutputSchema}
  });
    
  if (!output?.script) {
    throw new Error("The AI failed to generate a script based on the provided inputs.");
  }
  return output;
}


// STEP 2: VOICE OVER GENERATION ===============================================

const GeneratePipelineVoiceOverInputSchema = z.object({
  script: z
    .string()
    .describe('The text script to be converted into a voice over.'),
  voice: z.string().describe('The pre-built voice to use for this speaker.'),
});
export type GeneratePipelineVoiceOverInput = z.infer<typeof GeneratePipelineVoiceOverInputSchema>;

const GeneratePipelineVoiceOverOutputSchema = z.object({
  audioUrl: z.string().describe('The public URL of the generated audio file.'),
});
export type GeneratePipelineVoiceOverOutput = z.infer<typeof GeneratePipelineVoiceOverOutputSchema>;

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

export async function generatePipelineVoiceOver(input: GeneratePipelineVoiceOverInput): Promise<GeneratePipelineVoiceOverOutput> {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error("User must be authenticated to generate audio.");
    }
  
  // We extract only the spoken parts from the script for the TTS model.
  const voiceOverText = input.script.match(/Voiceover:|VO:|Narrator:|Dialogue:/g) 
    ? input.script.split(/Voiceover:|VO:|Narrator:|Dialogue:/).slice(1).join(' ').replace(/\[.*?\]/g, '')
    : input.script; // Fallback to using the whole script if no cues are found.

  // Get the provider info and extract just the model string
  const providerInfo = await getAvailableTTSProvider();
  
  const {media} = await ai.generate({
      prompt: voiceOverText,
      model: providerInfo.model, // Use just the model string, not the full provider info
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
            voiceConfig: {
                prebuiltVoiceConfig: { voiceName: input.voice },
            },
        }
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
    
    // Extract the original prompt from the script for better naming
    const originalPromptMatch = input.script.match(/Core Idea: (.*?)\n/);
    const assetName = originalPromptMatch ? originalPromptMatch[1] : `Pipeline Voice Over: ${input.script.substring(0, 30)}...`;

    await prisma.mediaAsset.create({
        data: {
            name: assetName,
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


// STEP 3: VIDEO GENERATION ==================================================

const GeneratePipelineVideoInputSchema = z.object({
  script: z.string().describe('The full script including scene descriptions.'),
});
export type GeneratePipelineVideoInput = z.infer<typeof GeneratePipelineVideoInputSchema>;

const GeneratePipelineVideoOutputSchema = z.object({
  videoUrl: z.string().describe('The public URL of the generated video.'),
});
export type GeneratePipelineVideoOutput = z.infer<typeof GeneratePipelineVideoOutputSchema>;

export async function generatePipelineVideo(input: GeneratePipelineVideoInput): Promise<GeneratePipelineVideoOutput> {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            throw new Error("User must be authenticated to generate media.");
        }

        // Extract scene descriptions from the script to create a visual prompt
        const sceneDescriptions = input.script.match(/\[SCENE:.*?\]/g) || [];
        const visualPrompt = sceneDescriptions.length > 0
            ? sceneDescriptions.join(' ').replace(/\[SCENE:/g, '').replace(/\]/g, '')
            : input.script.substring(0, 200); // Fallback to first 200 characters

        // For now, we'll use a placeholder image URL since we don't have actual images in the pipeline
        // In a real implementation, this would be replaced with actual generated or provided images
        const placeholderImageUrl = "https://placehold.co/1920x1080/000000/FFFFFF/png?text=Generated+Video+Scene";

        // Import the video generation function
        const { generateVideoFromImage } = await import('./generate-video-from-image');

        try {
            // Generate video using the real video generation API
            const result = await generateVideoFromImage({
                photoUrl: placeholderImageUrl,
                musicPrompt: "Energetic background music",
                videoDescription: visualPrompt
            });

            return {
                videoUrl: result.videoUrl,
            };
        } catch (error) {
            console.error("Video generation failed:", error);
            throw new Error(`Failed to generate video: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Pipeline video generation failed:', error);
        throw new Error(`Pipeline video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
