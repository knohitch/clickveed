/**
 * @fileOverview Type definitions and schemas for AI flow server actions.
 * This file contains all types and schemas that are exported from AI flows.
 * 
 * IMPORTANT: This file does NOT have 'use server' directive because it exports
 * types and constants, which cannot be exported from server action files.
 */

import { z } from 'zod';

// ============================================================================
// ANALYZE THUMBNAILS
// ============================================================================

export const AnalyzeThumbnailsInputSchema = z.object({
    thumbnailA: z.any().describe('Thumbnail A file'),
    thumbnailB: z.any().describe('Thumbnail B file'),
    videoTitle: z.string().min(5).describe('The title of the video'),
    targetAudience: z.string().min(10).describe('Description of the target audience'),
});
export type AnalyzeThumbnailsInput = z.infer<typeof AnalyzeThumbnailsInputSchema>;

export const ThumbnailAnalysisSchema = z.object({
    summary: z.string().describe('A brief summary of the thumbnail analysis'),
    score: z.number().int().min(0).max(100).describe('Engagement score from 0-100'),
    pros: z.array(z.string()).describe('List of strengths'),
    cons: z.array(z.string()).describe('List of weaknesses'),
});

export const AnalyzeThumbnailsOutputSchema = z.object({
    analysisA: ThumbnailAnalysisSchema.describe('Analysis for Thumbnail A'),
    analysisB: ThumbnailAnalysisSchema.describe('Analysis for Thumbnail B'),
    recommendation: z.enum(['A', 'B']).describe('Which thumbnail is recommended'),
    reasoning: z.string().describe('Explanation for the recommendation'),
});
export type AnalyzeThumbnailsOutput = z.infer<typeof AnalyzeThumbnailsOutputSchema>;

// ============================================================================
// CREATE VOICE CLONE
// ============================================================================

export const CreateVoiceCloneInputSchema = z.object({
    voiceName: z.string().describe('The name for the new cloned voice.'),
    fileUrls: z
        .array(z.string().url())
        .describe("An array of public URLs to the audio samples."),
});
export type CreateVoiceCloneInput = z.infer<typeof CreateVoiceCloneInputSchema>;

export const CreateVoiceCloneOutputSchema = z.object({
    voiceId: z.string().describe('A unique identifier for the new voice clone job.'),
    message: z.string().describe('A confirmation message indicating the process has started.'),
});
export type CreateVoiceCloneOutput = z.infer<typeof CreateVoiceCloneOutputSchema>;

// ============================================================================
// CREATIVE ASSISTANT CHAT
// ============================================================================

export const CreativeAssistantChatInputSchema = z.object({
    history: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
    })).optional(),
    message: z.string(),
});
export type CreativeAssistantChatInput = z.infer<typeof CreativeAssistantChatInputSchema>;

export const creativeAssistantSystemPrompt = `You are a Creative AI Assistant for ClickVid Pro, a video marketing platform.
You help users with:
- Video content ideas and scripting
- Thumbnail design suggestions
- SEO optimization for video titles and descriptions
- Content strategy and planning
- Video editing tips and best practices

Be creative, helpful, and provide actionable suggestions. Use markdown formatting for clarity.
When suggesting ideas, be specific and provide examples.`;

// ============================================================================
// FIND VIRAL CLIPS
// ============================================================================

export const FindViralClipsInputSchema = z.object({
    videoId: z.string().describe("The ID of the video to be analyzed."),
});
export type FindViralClipsInput = z.infer<typeof FindViralClipsInputSchema>;

export const ClipSchema = z.object({
    id: z.number().describe("A unique ID for the clip."),
    title: z.string().describe("A catchy, short title for the potential clip."),
    startTime: z.number().int().describe("The start time of the clip in seconds."),
    endTime: z.number().int().describe("The end time of the clip in seconds."),
    reason: z.string().describe("A brief explanation of why this clip is potentially viral."),
    score: z.number().int().min(0).max(100).describe("A virality score from 0 to 100.")
});

export const FindViralClipsOutputSchema = z.object({
    clips: z.array(ClipSchema).describe("An array of suggested viral clips from the video."),
});
export type FindViralClipsOutput = z.infer<typeof FindViralClipsOutputSchema>;

// ============================================================================
// GENERATE PERSONA AVATAR
// ============================================================================

export const GeneratePersonaAvatarInputSchema = z.object({
    personaName: z.string().describe('The name of the AI persona.'),
    personaDescription: z
        .string()
        .describe('A detailed description of the persona including their personality, expertise, and communication style.'),
    avatarDescription: z
        .string()
        .describe('A detailed visual description of the avatar to be generated.'),
    script: z
        .string()
        .describe('The script the avatar should speak in the video.')
});
export type GeneratePersonaAvatarInput = z.infer<typeof GeneratePersonaAvatarInputSchema>;

export const GeneratePersonaAvatarOutputSchema = z.object({
    avatarImageUrl: z.string().url().describe('The public URL of the generated avatar image.'),
    videoStatus: z.string().describe("A status message about the video generation process.")
});
export type GeneratePersonaAvatarOutput = z.infer<typeof GeneratePersonaAvatarOutputSchema>;

// ============================================================================
// GENERATE STOCK MEDIA
// ============================================================================

export const GenerateStockMediaInputSchema = z.object({
    prompt: z
        .string()
        .describe('A text description of the image to be generated.'),
});
export type GenerateStockMediaInput = z.infer<typeof GenerateStockMediaInputSchema>;

export const GenerateStockMediaOutputSchema = z.object({
    images: z
        .array(z.string().url())
        .describe('An array of public URLs for the generated images.'),
});
export type GenerateStockMediaOutput = z.infer<typeof GenerateStockMediaOutputSchema>;

// ============================================================================
// GENERATE TIMED TRANSCRIPT
// ============================================================================

export const GenerateTimedTranscriptInputSchema = z.object({
    videoUrl: z
        .string()
        .url()
        .describe("The public URL of the video file to be transcribed."),
});
export type GenerateTimedTranscriptInput = z.infer<typeof GenerateTimedTranscriptInputSchema>;

export const TimedWordSchema = z.object({
    word: z.string().describe("The transcribed word."),
    start: z.number().describe("The start time of the word in seconds."),
    end: z.number().describe("The end time of the word in seconds."),
});
export type TimedWord = z.infer<typeof TimedWordSchema>;

export const GenerateTimedTranscriptOutputSchema = z.object({
    transcript: z.array(TimedWordSchema).describe('An array of transcribed words with their start and end times.'),
});
export type GenerateTimedTranscriptOutput = z.infer<typeof GenerateTimedTranscriptOutputSchema>;

// ============================================================================
// GENERATE VIDEO FROM IMAGE
// ============================================================================

export const GenerateVideoFromImageInputSchema = z.object({
    photoUrl: z
        .string()
        .url()
        .describe("A public URL to a photo to create a video from."),
    musicPrompt: z.string().describe('A prompt describing the type of music to add to the video.'),
    videoDescription: z.string().describe('A description of the desired video content.'),
});
export type GenerateVideoFromImageInput = z.infer<typeof GenerateVideoFromImageInputSchema>;

export const GenerateVideoFromImageOutputSchema = z.object({
    videoUrl: z.string().url().describe('The public URL of the generated video.'),
    audioUrl: z.string().url().describe('The public URL of the generated audio.'),
});
export type GenerateVideoFromImageOutput = z.infer<typeof GenerateVideoFromImageOutputSchema>;

// ============================================================================
// GENERATE VIDEO SCRIPT
// ============================================================================

export const GenerateVideoScriptInputSchema = z.object({
    topic: z.string().describe('The main topic or idea for the video.'),
    style: z.string().optional().describe('The style of the video (e.g., "explainer", "tutorial", "vlog").'),
    length: z.string().optional().default('2 minutes').describe('Target length of the video.'),
    tone: z.string().optional().default('professional').describe('Tone of the script (e.g., "casual", "formal", "humorous").'),
});
export type GenerateVideoScriptInput = z.infer<typeof GenerateVideoScriptInputSchema>;

export const GenerateVideoScriptOutputSchema = z.object({
    script: z.string().describe('The generated video script, including scenes, voiceover, and timing cues.'),
    title: z.string().describe('A suggested title for the video.'),
    durationEstimate: z.string().describe('Estimated duration based on the script.'),
});
export type GenerateVideoScriptOutput = z.infer<typeof GenerateVideoScriptOutputSchema>;

// ============================================================================
// GENERATE VOICE OVER
// ============================================================================

export const SpeakerSchema = z.object({
    speakerId: z.string().describe('The identifier for the speaker, e.g., "Speaker1"'),
    voice: z.string().describe('The pre-built voice to use for this speaker.'),
});

export const GenerateVoiceOverInputSchema = z.object({
    script: z
        .string()
        .describe('The text script to be converted into a voice over.'),
    speakers: z.array(SpeakerSchema).optional().describe('An array of speakers and their assigned voices for multi-speaker generation.'),
});
export type GenerateVoiceOverInput = z.infer<typeof GenerateVoiceOverInputSchema>;

export const GenerateVoiceOverOutputSchema = z.object({
    audioUrl: z.string().url().describe('The public URL of the generated audio file.'),
});
export type GenerateVoiceOverOutput = z.infer<typeof GenerateVoiceOverOutputSchema>;

// ============================================================================
// REMOVE IMAGE BACKGROUND
// ============================================================================

export const RemoveImageBackgroundInputSchema = z.object({
    imageUrl: z
        .string()
        .url()
        .describe("The public URL of the image to process."),
});
export type RemoveImageBackgroundInput = z.infer<typeof RemoveImageBackgroundInputSchema>;

export const RemoveImageBackgroundOutputSchema = z.object({
    imageUrl: z.string().url().describe('The public URL of the image with the background removed.'),
});
export type RemoveImageBackgroundOutput = z.infer<typeof RemoveImageBackgroundOutputSchema>;

// ============================================================================
// REPURPOSE CONTENT
// ============================================================================

export const RepurposeContentInputSchema = z.object({
    originalContent: z.string().describe('The original video script or description to repurpose.'),
    targetPlatform: z.string().default('social media').describe('Target platform (e.g., "TikTok", "LinkedIn", "Twitter").'),
    format: z.string().default('short clips').describe('Desired format (e.g., "short clips", "posts", "thumbnails").'),
});
export type RepurposeContentInput = z.infer<typeof RepurposeContentInputSchema>;

export const RepurposeContentOutputSchema = z.object({
    repurposedItems: z.array(z.object({
        type: z.string().describe('Type of repurposed content (e.g., "clip idea", "post caption").'),
        content: z.string().describe('The repurposed content.'),
        estimatedLength: z.string().optional().describe('Estimated length or details.'),
    })).describe('Array of repurposed content ideas.'),
    tips: z.string().describe('Tips for using the repurposed content.'),
});
export type RepurposeContentOutput = z.infer<typeof RepurposeContentOutputSchema>;

// ============================================================================
// RESEARCH VIDEO TOPIC
// ============================================================================

export const ResearchVideoTopicInputSchema = z.object({
    topic: z.string().describe('The main topic to research for video ideas.'),
    platform: z.string().default('YouTube').describe('Target platform (e.g., "YouTube", "TikTok").'),
    audience: z.string().optional().describe('Target audience description.'),
});
export type ResearchVideoTopicInput = z.infer<typeof ResearchVideoTopicInputSchema>;

export const ResearchVideoTopicOutputSchema = z.object({
    keywords: z.array(z.string()).describe('Relevant SEO keywords and search terms.'),
    outline: z.array(z.string()).describe('Suggested video outline with sections.'),
    trends: z.string().describe('Current trends or hooks for the topic.'),
    titleIdeas: z.array(z.string()).describe('5 suggested video title ideas.'),
});
export type ResearchVideoTopicOutput = z.infer<typeof ResearchVideoTopicOutputSchema>;

// ============================================================================
// SUGGEST B-ROLL
// ============================================================================

export const SuggestBrollInputSchema = z.object({
    script: z.string().describe("The video script or a scene from the script."),
});
export type SuggestBrollInput = z.infer<typeof SuggestBrollInputSchema>;

export const SuggestBrollOutputSchema = z.object({
    suggestions: z.array(z.string()).describe("A list of 3-5 concise search terms for B-roll footage relevant to the script."),
});
export type SuggestBrollOutput = z.infer<typeof SuggestBrollOutputSchema>;

export const FetchStockVideosInputSchema = z.object({
    searchTerm: z.string().describe("The search term to find stock videos for."),
});
export type FetchStockVideosInput = z.infer<typeof FetchStockVideosInputSchema>;

export const StockVideoResultSchema = z.object({
    id: z.string().or(z.number()).transform(String),
    url: z.string().url(),
    thumbnail: z.string().url(),
    description: z.string(),
    photographer: z.string(),
});
export type StockVideoResult = z.infer<typeof StockVideoResultSchema>;

export const FetchStockVideosOutputSchema = z.object({
    videos: z.array(StockVideoResultSchema).describe("An array of stock video results."),
});
export type FetchStockVideosOutput = z.infer<typeof FetchStockVideosOutputSchema>;

// ============================================================================
// SUMMARIZE VIDEO CONTENT
// ============================================================================

export const SummarizeVideoContentInputSchema = z.object({
    videoUrl: z
        .string().optional()
        .describe('The URL of the video to be summarized.'),
    transcript: z
        .string()
        .describe('The transcript of the video, to be used for summarization.'),
});
export type SummarizeVideoContentInput = z.infer<typeof SummarizeVideoContentInputSchema>;

export const SummarizeVideoContentOutputSchema = z.object({
    summary: z.string().describe('A summary of the video content.'),
});
export type SummarizeVideoContentOutput = z.infer<typeof SummarizeVideoContentOutputSchema>;

// ============================================================================
// SUPPORT CHAT
// ============================================================================

export const SupportChatSchema = z.object({
    history: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
    })).optional(),
    message: z.string(),
});
export type SupportChatRequest = z.infer<typeof SupportChatSchema>;

export const supportChatSystemPrompt = `You are ClickVid Support AI, a helpful customer support assistant for the ClickVid Pro video platform.
You assist with technical issues, billing, features, and general questions.
Be empathetic, clear, and solution-oriented. If you can't resolve, suggest contacting human support.
Escalate complex issues (e.g., account suspension) by saying "I'll create a ticket for our team."
Keep responses concise and use bullet points for steps.
`;

// ============================================================================
// VIDEO PIPELINE
// ============================================================================

export const GeneratePipelineScriptInputSchema = z.object({
    prompt: z.string().describe('The core topic or idea for the video script.'),
    videoType: z.string().describe('The type or format of the video (e.g., "Commercial", "Explainer", "Social Media Ad").'),
    tone: z.string().describe('The desired tone of the video (e.g., "Humorous", "Formal", "Inspirational").'),
    duration: z.string().describe('The target duration of the video (e.g., "30 seconds", "2 minutes").'),
});
export type GeneratePipelineScriptInput = z.infer<typeof GeneratePipelineScriptInputSchema>;

export const GeneratePipelineScriptOutputSchema = z.object({
    script: z.string().describe('The generated video script, formatted and ready for production.'),
});
export type GeneratePipelineScriptOutput = z.infer<typeof GeneratePipelineScriptOutputSchema>;

export const GeneratePipelineVoiceOverInputSchema = z.object({
    script: z
        .string()
        .describe('The text script to be converted into a voice over.'),
    voice: z.string().describe('The pre-built voice to use for this speaker.'),
});
export type GeneratePipelineVoiceOverInput = z.infer<typeof GeneratePipelineVoiceOverInputSchema>;

export const GeneratePipelineVoiceOverOutputSchema = z.object({
    audioUrl: z.string().describe('The public URL of the generated audio file.'),
});
export type GeneratePipelineVoiceOverOutput = z.infer<typeof GeneratePipelineVoiceOverOutputSchema>;

export const GeneratePipelineVideoInputSchema = z.object({
    script: z.string().describe('The full script including scene descriptions.'),
});
export type GeneratePipelineVideoInput = z.infer<typeof GeneratePipelineVideoInputSchema>;

export const GeneratePipelineVideoOutputSchema = z.object({
    videoUrl: z.string().describe('The public URL of the generated video.'),
});
export type GeneratePipelineVideoOutput = z.infer<typeof GeneratePipelineVideoOutputSchema>;

// ============================================================================
// GENERATE AUTOMATION WORKFLOW
// ============================================================================

export const GenerateAutomationWorkflowInputSchema = z.object({
    prompt: z
        .string()
        .describe('A natural language description of the desired automation workflow.'),
    platform: z
        .enum(['n8n', 'Make.com'])
        .describe('The target automation platform.'),
});
export type GenerateAutomationWorkflowInput = z.infer<typeof GenerateAutomationWorkflowInputSchema>;

export const GenerateAutomationWorkflowOutputSchema = z.object({
    workflow: z
        .any()
        .describe(
            'A JSON representation of the generated workflow, compatible with the specified platform.'
        ),
});
export type GenerateAutomationWorkflowOutput = z.infer<typeof GenerateAutomationWorkflowOutputSchema>;
