
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
  const llm = await getAvailableTextGenerator();
  
  const prompt = ai.definePrompt({
    name: 'generatePipelineScriptPrompt',
    input: {schema: GeneratePipelineScriptInputSchema},
    output: {schema: GeneratePipelineScriptOutputSchema},
    prompt: `You are an expert AI video scriptwriter. Your task is to generate a compelling and well-structured video script based on the user's requirements.

  Pay close attention to all the details provided:

  - **Core Idea:** {{{prompt}}}
  - **Video Type:** {{{videoType}}}
  - **Desired Tone:** {{{tone}}}
  - **Target Duration:** {{{duration}}}

  Based on this, create a complete script. The script should include scene descriptions (like "[SCENE: A programmer's desk with code on screen]"), dialogue/voiceover, and camera/action cues where appropriate. Ensure the final script is plausible for the specified duration.
  `,
  });

  const {output} = await llm.generate(prompt, input);
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
    const ttsProvider = await getAvailableTTSProvider();
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error("User must be authenticated to generate audio.");
    }
  
  // We extract only the spoken parts from the script for the TTS model.
  const voiceOverText = input.script.match(/Voiceover:|VO:|Narrator:|Dialogue:/g) 
    ? input.script.split(/Voiceover:|VO:|Narrator:|Dialogue:/).slice(1).join(' ').replace(/\[.*?\]/g, '')
    : input.script; // Fallback to using the whole script if no cues are found.

  const {media} = await ttsProvider.generate({
      prompt: voiceOverText,
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
    const videoGenerator = await getAvailableVideoGenerator();
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error("User must be authenticated to generate media.");
    }

    // Extract scene descriptions from the script to create a prompt for the video model.
    const sceneDescriptions = input.script
        .split('\n')
        .filter(line => line.startsWith('[SCENE:'))
        .map(line => line.replace('[SCENE:', '').replace(']', '').trim())
        .join(', ');

    const videoPrompt = sceneDescriptions 
        ? `Create a short video that visually represents the following scenes: ${sceneDescriptions}`
        : `Create a short video that visually represents the overall theme of this script: ${input.script.substring(0, 200)}...`;

    let { operation } = await videoGenerator.generate({
      prompt: videoPrompt,
      config: {
          durationSeconds: 8,
          aspectRatio: '16:9',
      }
    });

     if (!operation) {
        throw new Error('Expected the video model to return an operation.');
    }
    
    // Poll for video completion
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
    
    // Sequential upload and DB write to prevent orphaned files
    const { publicUrl, sizeMB } = await uploadToWasabi(videoMediaPart.media.url, 'videos');
    
    // Extract the original prompt from the script for better naming
    const originalPromptMatch = input.script.match(/Core Idea: (.*?)\n/);
    const assetName = originalPromptMatch ? originalPromptMatch[1] : `Pipeline Video: ${input.script.substring(0, 30)}...`;

    await prisma.mediaAsset.create({
        data: {
            name: assetName,
            type: 'VIDEO',
            url: publicUrl,
            size: sizeMB,
            userId: session.user.id,
        }
    });

    return {
      videoUrl: publicUrl,
    };
}
