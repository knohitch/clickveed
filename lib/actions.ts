
"use server";

import { generateVideoScript } from "@/ai/flows/generate-video-script";
import { generateVideoFromImage } from "@/ai/flows/generate-video-from-image";
import { generateAutomationWorkflow } from "@/ai/flows/generate-automation-workflow";
import { generatePersonaAvatar } from "@/ai/flows/generate-persona-avatar";
import { generateVoiceOver } from "@/ai/flows/generate-voice-over";
import { createVoiceClone } from "@/ai/flows/create-voice-clone";
import { generateVideoFromUrl } from "@/ai/flows/generate-video-from-url";
import { generateStockMedia } from "@/ai/flows/generate-stock-media";
import { findViralClips } from "@/ai/flows/find-viral-clips";
import { generatePipelineScript, generatePipelineVoiceOver, generatePipelineVideo } from "@/ai/flows/video-pipeline";
import { transcribeVideo } from "@/ai/flows/transcribe-video";
import { summarizeVideoContent } from "@/ai/flows/summarize-video-content";
import { removeImageBackground } from "@/ai/flows/remove-image-background";
import { creativeAssistantChat } from "@/ai/flows/creative-assistant-chat";
import { supportChat } from "@/ai/flows/support-chat";
import { repurposeContent } from "@/ai/flows/repurpose-content";
import { analyzeThumbnails } from "@/ai/flows/analyze-thumbnails";
import { researchVideoTopic } from "@/ai/flows/research-video-topic";
import { z } from "zod";
import type { CreativeAssistantChatRequest, Message } from "@/lib/types";
import { revalidatePath } from "next/cache";

// Re-exporting for client component consumption
export type { Message };

const scriptSchema = z.object({
  prompt: z.string().min(10, { message: "Prompt must be at least 10 characters long." }),
  videoType: z.string().min(1, { message: "Please select a video type."}),
  tone: z.string().min(1, { message: "Please select a tone."}),
  duration: z.string().min(1, { message: "Please specify a duration."}),
});

export async function generateScriptAction(prevState: any, formData: FormData) {
  const validatedFields = scriptSchema.safeParse({
    prompt: formData.get('prompt'),
    videoType: formData.get('videoType'),
    tone: formData.get('tone'),
    duration: formData.get('duration'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
      script: null,
    };
  }

  try {
    const result = await generateVideoScript(validatedFields.data);
    return { message: "success", script: result.script, errors: {} };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { message: `An error occurred while generating the script: ${errorMessage}`, script: null, errors: {} };
  }
}


const videoSchema = z.object({
    image: z.any().refine((file) => file?.size > 0, 'Image is required.'),
    musicPrompt: z.string().min(3, 'Music prompt is required.'),
    videoDescription: z.string().min(10, 'Video description is required.'),
});

export async function generateVideoAction(prevState: any, formData: FormData) {
    const validatedFields = videoSchema.safeParse({
        image: formData.get('image'),
        musicPrompt: formData.get('musicPrompt'),
        videoDescription: formData.get('videoDescription'),
    });
    
    if (!validatedFields.success) {
        return {
            message: 'Validation failed',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { image, musicPrompt, videoDescription } = validatedFields.data;

    try {
        const buffer = Buffer.from(await image.arrayBuffer());
        const photoDataUri = `data:${image.type};base64,${buffer.toString("base64")}`;

        const result = await generateVideoFromImage({
            photoDataUri,
            musicPrompt,
            videoDescription,
        });
        
        return { message: "success", video: result.videoDataUri, audio: result.audioDataUri, errors: {} };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { message: `An error occurred while generating the video: ${errorMessage}`, video: null, audio: null, errors: {} };
    }
}


const automationWorkflowSchema = z.object({
    prompt: z.string().min(10, { message: "Workflow description must be at least 10 characters long." }),
    platform: z.enum(['n8n', 'Make.com']),
});

export async function generateAutomationWorkflowAction(prevState: any, formData: FormData) {
    const validatedFields = automationWorkflowSchema.safeParse({
        prompt: formData.get('prompt'),
        platform: formData.get('platform'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Validation failed',
            errors: validatedFields.error.flatten().fieldErrors,
            workflow: null,
        };
    }

    try {
        const result = await generateAutomationWorkflow(validatedFields.data);
        return { message: "success", workflow: result.workflow, errors: {} };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { message: `An error occurred while generating the workflow: ${errorMessage}`, workflow: null, errors: {} };
    }
}

const personaAvatarSchema = z.object({
    personaName: z.string().min(3, { message: "Persona name must be at least 3 characters long." }),
    personaDescription: z.string().min(10, { message: "Persona description must be at least 10 characters long." }),
    avatarDescription: z.string().min(10, { message: "Avatar description must be at least 10 characters long." }),
});

export async function generatePersonaAvatarAction(formData: FormData) {
    const validatedFields = personaAvatarSchema.safeParse({
        personaName: formData.get('personaName'),
        personaDescription: formData.get('personaDescription'),
        avatarDescription: formData.get('avatarDescription'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Validation failed',
            errors: validatedFields.error.flatten().fieldErrors,
            avatar: null,
        };
    }

    try {
        const result = await generatePersonaAvatar(validatedFields.data);
        return { message: "success", avatar: result.avatarDataUri, errors: {} };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { message: `An error occurred while generating the avatar: ${errorMessage}`, avatar: null, errors: {} };
    }
}

const voiceOverSchema = z.object({
  script: z.string().min(1, { message: "Script cannot be empty." }),
  speakers: z.array(z.object({
    speakerId: z.string(),
    voice: z.string().min(1, { message: "Please select a voice for each speaker." }),
  })).min(1, { message: "Please configure at least one speaker." }),
});

export async function generateVoiceOverAction(prevState: any, formData: FormData) {
  const isMultiSpeaker = formData.get('isMultiSpeaker') === 'on';
  const script = formData.get('script') as string;
  const speakersData = formData.get('speakers') as string;
  let parsedSpeakers = [];

  try {
    if (speakersData) {
      parsedSpeakers = JSON.parse(speakersData);
    }
  } catch (e) {
    return {
      message: 'Invalid speaker data format.',
      errors: { speakers: ['Could not parse speaker configuration.'] },
      audio: null,
    };
  }
  
  let speakers: { speakerId: string; voice: string }[] = [];

  if (isMultiSpeaker) {
    speakers = parsedSpeakers.map((speaker: { id: number; voice: string }, index: number) => ({
      speakerId: `Speaker${index + 1}`,
      voice: speaker.voice,
    }));
  } else if (parsedSpeakers.length > 0) {
    speakers.push({
      speakerId: 'Speaker1',
      voice: parsedSpeakers[0].voice,
    });
  }

  const validatedFields = voiceOverSchema.safeParse({
    script,
    speakers,
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
      audio: null,
    };
  }

  try {
    const result = await generateVoiceOver(validatedFields.data);
    return { message: "success", audio: result.audioDataUri, errors: {} };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { message: `An error occurred while generating the voice over: ${errorMessage}`, audio: null, errors: {} };
  }
}

const voiceCloneSchema = z.object({
  voiceName: z.string().min(3, { message: "Voice name must be at least 3 characters." }),
  files: z.array(z.instanceof(File)).min(1, { message: "Please upload at least one audio file." }),
});

export async function createVoiceCloneAction(prevState: any, formData: FormData) {
  const validatedFields = voiceCloneSchema.safeParse({
    voiceName: formData.get('voiceName'),
    files: formData.getAll('files'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { voiceName, files } = validatedFields.data;

  try {
    const audioDataUris = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return `data:${file.type};base64,${buffer.toString("base64")}`;
      })
    );

    const result = await createVoiceClone({
      voiceName,
      audioDataUris,
    });

    return { message: "success", result, errors: {} };
  } catch (error) {
    console.error("Voice Clone Action Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during voice clone submission.";
    return { message: errorMessage, errors: {} };
  }
}

const videoFromUrlSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL." }),
  topic: z.string().min(10, { message: "Topic must be at least 10 characters long." }),
});

export async function generateVideoFromUrlAction(prevState: any, formData: FormData) {
  const validatedFields = videoFromUrlSchema.safeParse({
    url: formData.get('url'),
    topic: formData.get('topic'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
      script: null,
    };
  }

  try {
    const result = await generateVideoFromUrl(validatedFields.data);
    return { message: "success", script: result.script, errors: {} };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { message: `An error occurred while generating the script: ${errorMessage}`, script: null, errors: {} };
  }
}

const stockMediaSchema = z.object({
  prompt: z.string().min(3, { message: "Search prompt must be at least 3 characters long." }),
});

export async function generateStockMediaAction(prevState: any, formData: FormData) {
  const validatedFields = stockMediaSchema.safeParse({
    prompt: formData.get('prompt'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
      images: [],
    };
  }

  try {
    const result = await generateStockMedia(validatedFields.data);
    return { message: "success", images: result.images, errors: {} };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { message: `An error occurred while generating media: ${errorMessage}`, images: [], errors: {} };
  }
}


const pipelineScriptSchema = z.object({
  prompt: z.string().min(10, { message: "Prompt must be at least 10 characters long." }),
  videoType: z.string().min(1, { message: "Please select a video type."}),
  tone: z.string().min(1, { message: "Please select a tone."}),
  duration: z.string().min(1, { message: "Please specify a duration."}),
});

export async function generatePipelineScriptAction(prevState: any, formData: FormData) {
  const validatedFields = pipelineScriptSchema.safeParse({
    prompt: formData.get('prompt'),
    videoType: formData.get('videoType'),
    tone: formData.get('tone'),
    duration: formData.get('duration'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
      script: null,
    };
  }

  try {
    const result = await generatePipelineScript(validatedFields.data);
    return { message: "success", script: result.script, errors: {} };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { message: `An error occurred while generating the script: ${errorMessage}`, script: null, errors: {} };
  }
}

const pipelineVoiceOverSchema = z.object({
    script: z.string().min(1, { message: "Script cannot be empty." }),
    voice: z.string().min(1, { message: "Please select a voice." }),
});

export async function generatePipelineVoiceOverAction(prevState: any, formData: FormData) {
    const validatedFields = pipelineVoiceOverSchema.safeParse({
        script: formData.get('script'),
        voice: formData.get('voice'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Validation failed',
            errors: validatedFields.error.flatten().fieldErrors,
            audio: null,
        };
    }

    try {
        const result = await generatePipelineVoiceOver(validatedFields.data);
        return { message: "success", audio: result.audioDataUri, errors: {} };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { message: `An error occurred while generating the voice over: ${errorMessage}`, audio: null, errors: {} };
    }
}

const pipelineVideoSchema = z.object({
    script: z.string().min(1, { message: "Script cannot be empty." }),
});

export async function generatePipelineVideoAction(prevState: any, formData: FormData) {
    const validatedFields = pipelineVideoSchema.safeParse({
        script: formData.get('script'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Validation failed',
            errors: validatedFields.error.flatten().fieldErrors,
            video: null,
        };
    }

    try {
        const result = await generatePipelineVideo(validatedFields.data);
        return { message: "success", video: result.videoDataUri, errors: {} };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { message: `An error occurred while generating the video: ${errorMessage}`, video: null, errors: {} };
    }
}


const findViralClipsSchema = z.object({
    video: z.any().refine((file) => file?.size > 0, 'A video file is required.'),
});

export async function findViralClipsAction(prevState: any, formData: FormData) {
    const validatedFields = findViralClipsSchema.safeParse({
        video: formData.get('video'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Validation failed',
            errors: validatedFields.error.flatten().fieldErrors,
            clips: [],
        };
    }

    try {
        const result = await findViralClips({ videoTitle: validatedFields.data.video.name });
        return { message: "success", clips: result.clips, errors: {} };
    } catch (error) {
        console.error("Find Viral Clips Action Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during video analysis.";
        return { message: errorMessage, clips: [], errors: {} };
    }
}


const transcribeVideoSchema = z.object({
    video: z.any().refine((file) => file?.size > 0, 'A video file is required.'),
});

export async function transcribeVideoAction(prevState: any, formData: FormData) {
    const validatedFields = transcribeVideoSchema.safeParse({
        video: formData.get('video'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Validation failed',
            errors: validatedFields.error.flatten().fieldErrors,
            transcript: null,
        };
    }

    const { video } = validatedFields.data;

    try {
        const buffer = Buffer.from(await video.arrayBuffer());
        const videoDataUri = `data:${video.type};base64,${buffer.toString("base64")}`;

        const result = await transcribeVideo({ videoDataUri });
        
        return { message: "success", transcript: result.transcript, errors: {} };
    } catch (error) {
        console.error("Transcription Action Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during transcription.";
        return { message: errorMessage, transcript: null, errors: {} };
    }
}


const removeBgSchema = z.object({
    image: z.instanceof(File).refine((file) => file.size > 0, "An image file is required."),
});

export async function removeImageBackgroundAction(prevState: any, formData: FormData) {
    const validatedFields = removeBgSchema.safeParse({
        image: formData.get('image'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Validation failed',
            errors: validatedFields.error.flatten().fieldErrors,
            image: null,
        };
    }

    const { image } = validatedFields.data;

    try {
        const buffer = Buffer.from(await image.arrayBuffer());
        const imageDataUri = `data:${image.type};base64,${buffer.toString("base64")}`;

        const result = await removeImageBackground({ imageDataUri });
        
        return { message: "success", image: result.imageDataUri, errors: {} };
    } catch (error) {
        console.error("Remove Background Action Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during background removal.";
        return { message: errorMessage, image: null, errors: {} };
    }
}


export async function creativeAssistantChatAction(prevState: any, formData: FormData) {
    const message = formData.get('message') as string;
    const historyData = formData.get('history') as string | null;

    let history: Message[] = [];
    if (historyData) {
        try {
            history = JSON.parse(historyData);
        } catch (e) {
            console.error("Failed to parse chat history:", e);
        }
    }
    
    try {
        const stream = await creativeAssistantChat({ history, message });
        return { message: "", stream, errors: {} };
    } catch (error) {
        console.error("Creative Assistant Chat Action Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during chat processing.";
        return { message: errorMessage, stream: null, errors: {} };
    }
}

export async function supportChatAction(prevState: any, formData: FormData) {
    const message = formData.get('message') as string;
    const historyData = formData.get('history') as string | null;

    let history: Message[] = [];
    if (historyData) {
        try {
            history = JSON.parse(historyData);
        } catch (e) {
            console.error("Failed to parse chat history:", e);
        }
    }
    
    try {
        const stream = await supportChat({ history, message });
        // In a real app, you would also save this interaction to a support ticket database here.
        return { message: "", stream, errors: {} };
    } catch (error) {
        console.error("Support Chat Action Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during chat processing.";
        return { message: errorMessage, stream: null, errors: {} };
    }
}


const summarizeContentSchema = z.object({
  videoUrl: z.string().optional(),
  transcript: z.string().min(1, { message: "Transcript cannot be empty."}),
});

export async function summarizeVideoContentAction(prevState: any, formData: FormData) {
    const validatedFields = summarizeContentSchema.safeParse({
        videoUrl: formData.get('videoUrl'),
        transcript: formData.get('transcript'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Validation failed',
            errors: validatedFields.error.flatten().fieldErrors,
            summary: null,
        };
    }

    try {
        const result = await summarizeVideoContent(validatedFields.data);
        return { message: "success", summary: result.summary, errors: {} };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { message: `An error occurred while generating the summary: ${errorMessage}`, summary: null, errors: {} };
    }
}

const repurposeContentSchema = z.object({
  transcript: z.string().min(1, { message: "Transcript cannot be empty."}),
  format: z.enum(['linkedin-post', 'tweet-thread']),
});

export async function repurposeContentAction(input: z.infer<typeof repurposeContentSchema>) {
    const validatedFields = repurposeContentSchema.safeParse(input);

    if (!validatedFields.success) {
        return {
            message: 'Validation failed',
            errors: validatedFields.error.flatten().fieldErrors,
            content: null,
        };
    }

    try {
        const result = await repurposeContent(validatedFields.data);
        return { message: "success", content: result.content, errors: {} };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { message: `An error occurred while repurposing the content: ${errorMessage}`, content: null, errors: {} };
    }
}


const analyzeThumbnailsSchema = z.object({
    thumbnailA: z.instanceof(File, { message: "Thumbnail A is required." }).refine(file => file.size > 0, "Thumbnail A cannot be empty."),
    thumbnailB: z.instanceof(File, { message: "Thumbnail B is required." }).refine(file => file.size > 0, "Thumbnail B cannot be empty."),
    videoTitle: z.string().min(5, { message: "Video title must be at least 5 characters long." }),
    targetAudience: z.string().min(10, { message: "Target audience must be at least 10 characters long." }),
});

export async function analyzeThumbnailsAction(prevState: any, formData: FormData) {
    const validatedFields = analyzeThumbnailsSchema.safeParse({
        thumbnailA: formData.get('thumbnailA'),
        thumbnailB: formData.get('thumbnailB'),
        videoTitle: formData.get('videoTitle'),
        targetAudience: formData.get('targetAudience'),
    });
    
    if (!validatedFields.success) {
        return {
            message: 'Validation failed',
            errors: validatedFields.error.flatten().fieldErrors,
            analysis: null,
        };
    }

    const { thumbnailA, thumbnailB, videoTitle, targetAudience } = validatedFields.data;

    try {
        const [bufferA, bufferB] = await Promise.all([
            thumbnailA.arrayBuffer(),
            thumbnailB.arrayBuffer()
        ]);

        const thumbnailA_DataUri = `data:${thumbnailA.type};base64,${Buffer.from(bufferA).toString("base64")}`;
        const thumbnailB_DataUri = `data:${thumbnailB.type};base64,${Buffer.from(bufferB).toString("base64")}`;

        const result = await analyzeThumbnails({
            thumbnailA_DataUri,
            thumbnailB_DataUri,
            videoTitle,
            targetAudience,
        });
        
        return { message: "success", analysis: result, errors: {} };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { message: `An error occurred while analyzing thumbnails: ${errorMessage}`, analysis: null, errors: {} };
    }
}


const researchVideoTopicSchema = z.object({
  topic: z.string().min(3, { message: "Topic must be at least 3 characters long." }),
});

export async function researchVideoTopicAction(prevState: any, formData: FormData) {
  const validatedFields = researchVideoTopicSchema.safeParse({
    topic: formData.get('topic'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
      ideas: [],
    };
  }

  try {
    const result = await researchVideoTopic(validatedFields.data);
    return { message: "success", ideas: result.ideas, errors: {} };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { message: `An error occurred while researching the topic: ${errorMessage}`, ideas: [], errors: {} };
  }
}


const createProjectSchema = z.object({
  title: z.string().min(1, { message: "Project title cannot be empty." }),
});

export async function createProjectAction(prevState: any, formData: FormData) {
  const validatedFields = createProjectSchema.safeParse({
    title: formData.get('projectTitle'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  // This is where you would interact with your database.
  // For now, it will be handled by client-side state.
  revalidatePath('/dashboard/projects');
  return { message: "success", errors: {} };
}
