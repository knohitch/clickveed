

'use server';

import { generateVideoScript } from "@/server/ai/flows/generate-video-script";
import { generateVideoFromImage } from "@/server/ai/flows/generate-video-from-image";
import { generateAutomationWorkflow } from "@/server/ai/flows/generate-automation-workflow";
import { generatePersonaAvatar } from "@/server/ai/flows/generate-persona-avatar";
import { generateVoiceOver } from "@/server/ai/flows/generate-voice-over";
import { createVoiceClone } from "@/server/ai/flows/create-voice-clone";
import { generateVideoFromUrl } from "@/server/ai/flows/generate-video-from-url";
import { generateStockMedia } from "@/server/ai/flows/generate-stock-media";
import { generatePipelineScript, generatePipelineVoiceOver, generatePipelineVideo } from "@/server/ai/flows/video-pipeline";
import { generateTimedTranscript as generateTimedTranscriptFlow } from "@/server/ai/flows/generate-timed-transcript";
import { summarizeVideoContent } from "@/server/ai/flows/summarize-video-content";
import { removeImageBackground } from "@/server/ai/flows/remove-image-background";
import { creativeAssistantChat } from "@/server/ai/flows/creative-assistant-chat";
import { supportChat } from "@/server/ai/flows/support-chat";
import { repurposeContent } from "@/server/ai/flows/repurpose-content";
import { analyzeThumbnails } from "@/server/ai/flows/analyze-thumbnails";
import { researchVideoTopic } from "@/server/ai/flows/research-video-topic";
import { findViralClips as findViralClipsFlow } from "@/server/ai/flows/find-viral-clips";
import { z } from "zod";
import type { CreativeAssistantChatRequest, Message } from "@/lib/types";
import { revalidatePath } from "next/cache";
import type { Video } from "@prisma/client";
import { suggestBroll, fetchStockVideos } from '@/server/ai/flows/suggest-b-roll';

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
    const result = await generateVideoScript({
        topic: validatedFields.data.prompt,
        length: validatedFields.data.duration,
        tone: validatedFields.data.tone,
        style: validatedFields.data.videoType,
    });
    return { message: "success", script: result.script, errors: {} };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { message: `An error occurred while generating the script: ${errorMessage}`, script: null, errors: {} };
  }
}


const videoSchema = z.object({
    imageUrl: z.string().url('A valid image URL is required.'),
    musicPrompt: z.string().min(3, 'Music prompt is required.'),
    videoDescription: z.string().min(10, 'Video description is required.'),
});

export async function generateVideoAction(prevState: any, formData: FormData) {
    const validatedFields = videoSchema.safeParse({
        imageUrl: formData.get('imageUrl'),
        musicPrompt: formData.get('musicPrompt'),
        videoDescription: formData.get('videoDescription'),
    });
    
    if (!validatedFields.success) {
        return {
            message: 'Validation failed',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    try {
        const result = await generateVideoFromImage({
            photoUrl: validatedFields.data.imageUrl,
            musicPrompt: validatedFields.data.musicPrompt,
            videoDescription: validatedFields.data.videoDescription,
        });
        
        return { message: "success", videoUrl: result.videoUrl, audioUrl: result.audioUrl, errors: {} };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { message: `An error occurred while generating the video: ${errorMessage}`, videoUrl: null, audioUrl: null, errors: {} };
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
    script: z.string().min(10, { message: "Script must be at least 10 characters long." }),
});

export async function generatePersonaAvatarAction(prevState: any, formData: FormData) {
    const validatedFields = personaAvatarSchema.safeParse({
        personaName: formData.get('personaName'),
        personaDescription: formData.get('personaDescription'),
        avatarDescription: formData.get('avatarDescription'),
        script: formData.get('script'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Validation failed',
            errors: validatedFields.error.flatten().fieldErrors,
            avatarImageUrl: null,
            videoStatus: null,
        };
    }

    try {
        const result = await generatePersonaAvatar(validatedFields.data);
        return { message: "success", ...result, errors: {} };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { message: `An error occurred while generating the avatar: ${errorMessage}`, avatarImageUrl: null, videoStatus: null, errors: {} };
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
    return { message: "success", audio: result.audioUrl, errors: {} };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { message: `An error occurred while generating the voice over: ${errorMessage}`, audio: null, errors: {} };
  }
}

const voiceCloneSchema = z.object({
  voiceName: z.string().min(3, { message: "Voice name must be at least 3 characters." }),
  fileUrls: z.array(z.string().url()).min(1, { message: "Please upload at least one audio file." }),
});

export async function createVoiceCloneAction(prevState: any, formData: FormData) {
  const validatedFields = voiceCloneSchema.safeParse({
    voiceName: formData.get('voiceName'),
    fileUrls: formData.getAll('fileUrls'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await createVoiceClone(validatedFields.data);
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
        return { message: "success", audio: result.audioUrl, errors: {} };
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
        return { message: "success", video: result.videoUrl, errors: {} };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { message: `An error occurred while generating the video: ${errorMessage}`, video: null, errors: {} };
    }
}

const generateTimedTranscriptSchema = z.object({
    videoUrl: z.string().url({ message: "A valid video URL is required."}),
});

export async function generateTimedTranscriptAction(prevState: any, formData: FormData) {
    const validatedFields = generateTimedTranscriptSchema.safeParse({
        videoUrl: formData.get('videoUrl'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Validation failed',
            errors: validatedFields.error.flatten().fieldErrors,
            transcript: null,
        };
    }
    
    try {
        const result = await generateTimedTranscriptFlow(validatedFields.data);
        return { message: "success", transcript: result.transcript, errors: {} };
    } catch (error) {
        console.error("Transcription Action Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during transcription.";
        return { message: errorMessage, transcript: null, errors: {} };
    }
}


const removeBgSchema = z.object({
    imageUrl: z.string().url({ message: "A valid image URL is required."}),
});

export async function removeImageBackgroundAction(prevState: any, formData: FormData) {
    const validatedFields = removeBgSchema.safeParse({
        imageUrl: formData.get('imageUrl'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Validation failed',
            errors: validatedFields.error.flatten().fieldErrors,
            image: null,
        };
    }
    
    try {
        const result = await removeImageBackground(validatedFields.data);
        return { message: "success", image: result.imageUrl, errors: {} };
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

    const transformedHistory = history.map(h => ({
        role: (h.role === 'model' ? 'assistant' : h.role) as 'user' | 'assistant',
        content: h.content,
    }));
    
    try {
        const stream = await supportChat({ history: transformedHistory, message });
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
        const result = await repurposeContent({
            originalContent: validatedFields.data.transcript,
            targetPlatform: validatedFields.data.format,
            format: validatedFields.data.format,
        });
        return { message: "success", content: result.repurposedItems, errors: {} };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { message: `An error occurred while repurposing the content: ${errorMessage}`, content: null, errors: {} };
    }
}


const analyzeThumbnailsSchema = z.object({
    thumbnailA_Url: z.string().url(),
    thumbnailB_Url: z.string().url(),
    videoTitle: z.string().min(5, { message: "Video title must be at least 5 characters long." }),
    targetAudience: z.string().min(10, { message: "Target audience must be at least 10 characters long." }),
});

export async function analyzeThumbnailsAction(prevState: any, formData: FormData) {
    const validatedFields = analyzeThumbnailsSchema.safeParse({
        thumbnailA_Url: formData.get('thumbnailA_Url'),
        thumbnailB_Url: formData.get('thumbnailB_Url'),
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
    
    try {
        // The data URLs are constructed on the client and passed in the form data
        const result = await analyzeThumbnails({
            thumbnailA_DataUri: formData.get('thumbnailA_Url') as string, // These are misnamed on the client side
            thumbnailB_DataUri: formData.get('thumbnailB_Url') as string, // but they are data URIs
            videoTitle: validatedFields.data.videoTitle,
            targetAudience: validatedFields.data.targetAudience
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
    const result = await researchVideoTopic({
        topic: validatedFields.data.topic,
        platform: 'YouTube', // Defaulting to a common platform
        audience: 'General Audience', // Defaulting to a common audience
    });
    return { message: "success", ideas: result.titleIdeas, errors: {} };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { message: `An error occurred while researching the topic: ${errorMessage}`, ideas: [], errors: {} };
  }
}

const shareVideoSchema = z.object({
    videoUrl: z.string().url(),
    platforms: z.string().min(1),
    caption: z.string().min(1),
});

export async function shareVideoToSocialsAction(prevState: any, formData: FormData) {
    const validatedFields = shareVideoSchema.safeParse({
        videoUrl: formData.get('videoUrl'),
        platforms: formData.get('platforms'),
        caption: formData.get('caption'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Validation failed',
            errors: validatedFields.error.flatten().fieldErrors,
        }
    }
    // In a real app, this would trigger individual API calls to each platform.
    // For now, we just simulate a success.
    console.log('Sharing video to:', validatedFields.data.platforms);
    return { message: 'success', errors: {} };
}

export async function findViralClips(input: { videoId: string; }): Promise<{ clips: { id: number; title: string; startTime: number; endTime: number; reason: string; score: number; }[]; }> {
    return findViralClipsFlow(input);
}

// B-Roll actions re-exported for client use
export { suggestBroll, fetchStockVideos };
