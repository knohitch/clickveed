import { extractAvatarImageUrl, extractAudioUrl, parseMultiSpeakerScript, buildPipelineVisualPrompt, extractPipelineVoiceOverText } from '@/server/ai/workflow-contract-helpers';
import type { VoiceCloneResponse } from '@/lib/elevenlabs-client';
import type {
  CreateVoiceCloneInput,
  CreateVoiceCloneOutput,
  GeneratePersonaAvatarInput,
  GeneratePersonaAvatarOutput,
  GeneratePipelineVideoInput,
  GeneratePipelineVideoOutput,
  GeneratePipelineVoiceOverInput,
  GeneratePipelineVoiceOverOutput,
  GenerateVoiceOverInput,
  GenerateVoiceOverOutput,
} from '@/server/ai/flows/types';

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

export async function runPersonaAvatarWorkflow(
  input: GeneratePersonaAvatarInput,
  deps: {
    userId: string;
    generateImage: (messages: Array<{ role: 'user'; content: Array<{ text: string }> }>) => Promise<unknown>;
    uploadImage: (dataUri: string) => Promise<{ publicUrl: string; sizeMB: number }>;
    createMediaAsset: (asset: { name: string; type: 'IMAGE'; url: string; size: number; userId: string }) => Promise<unknown>;
    createJob: (job: { userId: string; personaName: string; script: string; avatarImageUrl: string }) => Promise<{ id: string }>;
    enqueueJob: (jobId: string) => Promise<{ jobStatus: GeneratePersonaAvatarOutput['jobStatus']; videoStatus: string }>;
  }
): Promise<GeneratePersonaAvatarOutput> {
  const imageMessages = [{ role: 'user' as const, content: [{ text: input.avatarDescription }] }];
  const imageResponse = await deps.generateImage(imageMessages);
  const avatarImageDataUri = extractAvatarImageUrl(imageResponse);

  if (!avatarImageDataUri) {
    const provider = (imageResponse as any)?.provider || 'unknown';
    const model = (imageResponse as any)?.model || 'unknown';
    throw new Error(
      `Failed to generate the initial avatar image. No media returned by provider=${provider} model=${model}. ` +
      `Ensure a valid image provider (Gemini API key or Imagen/Replicate credentials) is configured in admin settings.`
    );
  }

  const { publicUrl: avatarImageUrl, sizeMB: avatarImageSize } = await deps.uploadImage(avatarImageDataUri);
  await deps.createMediaAsset({
    name: `Avatar Image: ${input.personaName}`,
    type: 'IMAGE',
    url: avatarImageUrl,
    size: avatarImageSize,
    userId: deps.userId,
  });

  const personaJob = await deps.createJob({
    userId: deps.userId,
    personaName: input.personaName,
    script: input.script,
    avatarImageUrl,
  });
  const queueResult = await deps.enqueueJob(personaJob.id);

  return {
    jobId: personaJob.id,
    jobStatus: queueResult.jobStatus,
    avatarImageUrl,
    videoStatus: queueResult.videoStatus,
    videoUrl: null,
  };
}

export async function runVoiceCloneWorkflow(
  input: CreateVoiceCloneInput,
  deps: {
    userId: string;
    userEmail?: string | null;
    resolveSamples: (fileUrls: string[], userId: string) => Promise<{ sampleKeys: string[]; sampleUrls: string[] }>;
    addVoiceClone: (
      voiceName: string,
      sampleUrls: string[],
      metadata: { description: string }
    ) => Promise<VoiceCloneResponse>;
    createVoiceCloneRecord: (record: {
      voiceId: string;
      name: string;
      userId: string;
      status: string;
      provider: string;
      sampleUrls: string[];
    }) => Promise<unknown>;
  }
): Promise<CreateVoiceCloneOutput> {
  const { sampleKeys, sampleUrls } = await deps.resolveSamples(input.fileUrls, deps.userId);
  const voiceCloneResponse = await deps.addVoiceClone(input.voiceName, sampleUrls, {
    description: `Voice clone created by ${deps.userEmail || deps.userId} on ${new Date().toISOString()}`,
  });

  await deps.createVoiceCloneRecord({
    voiceId: voiceCloneResponse.voiceId,
    name: input.voiceName,
    userId: deps.userId,
    status: 'completed',
    provider: 'elevenlabs',
    sampleUrls: sampleKeys,
  });

  return {
    voiceId: voiceCloneResponse.voiceId,
    message: `Voice cloning for "${input.voiceName}" has been successfully created with ID ${voiceCloneResponse.voiceId}.`,
  };
}

export async function runVoiceOverWorkflow(
  input: GenerateVoiceOverInput,
  deps: {
    userId: string;
    synthesizeSegmentAudio: (text: string, voiceId?: string) => Promise<string>;
    fetchAudioBuffer: (audioUrl: string) => Promise<{ buffer: Buffer; contentType: string }>;
    uploadCombinedAudio: (dataUri: string) => Promise<{ publicUrl: string }>;
    assertPlayableAudioUrl: (audioUrl: string) => Promise<void>;
    createMediaAsset: (asset: { name: string; type: 'AUDIO'; url: string; size: number; userId: string }) => Promise<unknown>;
  }
): Promise<GenerateVoiceOverOutput> {
  const availableSpeakers = input.speakers?.filter((speaker) => speaker.voice?.trim()) || [];
  const hasMultipleVoices = availableSpeakers.length > 1;

  let audioUrl: string;

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
    const uploaded = await deps.uploadCombinedAudio(`data:audio/mpeg;base64,${stitchedAudio.toString('base64')}`);
    audioUrl = uploaded.publicUrl;
    await deps.assertPlayableAudioUrl(audioUrl);
  } else {
    const selectedVoice = availableSpeakers[0]?.voice?.trim();
    audioUrl = await deps.synthesizeSegmentAudio(input.script, selectedVoice);
  }

  await deps.createMediaAsset({
    name: `Voice Over: ${input.script.substring(0, 30)}...`,
    type: 'AUDIO',
    url: audioUrl,
    size: 0,
    userId: deps.userId,
  });

  return { audioUrl };
}

async function toWav(
  pcmData: Buffer,
  encodeWav: (pcmData: Buffer, channels?: number, rate?: number, sampleWidth?: number) => Promise<string>
) {
  return encodeWav(pcmData, 1, 24000, 2);
}

export async function runPipelineVoiceOverWorkflow(
  input: GeneratePipelineVoiceOverInput,
  deps: {
    userId: string;
    generateTts: (voiceOverText: string, voiceId: string) => Promise<any>;
    uploadAudio: (dataUri: string) => Promise<{ publicUrl: string; sizeMB: number }>;
    createMediaAsset: (asset: { name: string; type: 'AUDIO'; url: string; size: number; userId: string }) => Promise<unknown>;
    encodeWav: (pcmData: Buffer, channels?: number, rate?: number, sampleWidth?: number) => Promise<string>;
  }
): Promise<GeneratePipelineVoiceOverOutput> {
  const voiceOverText = extractPipelineVoiceOverText(input.script);
  const ttsResponse: any = await deps.generateTts(voiceOverText, input.voice);

  const responseText = ttsResponse?.result?.content?.[0]?.text || '';
  let publicUrl = responseText.replace('Speech generated: ', '').trim() || ttsResponse?.audioUrl || '';
  let sizeMB = 0;

  if (!publicUrl && ttsResponse?.media?.url) {
    const audioPcmBuffer = Buffer.from(
      ttsResponse.media.url.substring(ttsResponse.media.url.indexOf(',') + 1),
      'base64'
    );
    const audioDataUri = 'data:audio/wav;base64,' + (await toWav(audioPcmBuffer, deps.encodeWav));
    const uploadResult = await deps.uploadAudio(audioDataUri);
    publicUrl = uploadResult.publicUrl;
    sizeMB = uploadResult.sizeMB;
  }

  if (!publicUrl) {
    throw new Error('Audio generation failed. No media was returned.');
  }

  const originalPromptMatch = input.script.match(/Core Idea: (.*?)\n/);
  const assetName = originalPromptMatch ? originalPromptMatch[1] : `Pipeline Voice Over: ${input.script.substring(0, 30)}...`;

  await deps.createMediaAsset({
    name: assetName,
    type: 'AUDIO',
    url: publicUrl,
    size: sizeMB,
    userId: deps.userId,
  });

  return { audioUrl: publicUrl };
}

export async function runPipelineVideoWorkflow(
  input: GeneratePipelineVideoInput,
  deps: {
    userId: string;
    generateImage: (visualPrompt: string) => Promise<any>;
    generateVideo: (prompt: string) => Promise<any>;
    createMediaAsset: (asset: { name: string; type: 'VIDEO'; url: string; size: number; userId: string }) => Promise<unknown>;
  }
): Promise<GeneratePipelineVideoOutput> {
  const visualPrompt = buildPipelineVisualPrompt(input.script);
  const imageResponse: any = await deps.generateImage(visualPrompt);

  let placeholderImageUrl = '';
  const media = imageResponse?.media;
  if (typeof media?.url === 'string') {
    placeholderImageUrl = media.url;
  } else if (Array.isArray(media) && typeof media[0]?.url === 'string') {
    placeholderImageUrl = media[0].url;
  } else {
    const text = imageResponse?.result?.content?.[0]?.text || '';
    if (typeof text === 'string' && text.startsWith('Image generated: ')) {
      placeholderImageUrl = text.replace('Image generated: ', '').trim();
    }
  }

  if (!placeholderImageUrl) {
    throw new Error('Image generation failed for video pipeline scene.');
  }

  const videoResponse: any = await deps.generateVideo(`${visualPrompt}\nImage: ${placeholderImageUrl}`);
  const videoText = videoResponse?.result?.content?.[0]?.text || '';
  const videoUrl = videoText.replace('Video generated: ', '').trim();

  if (!videoUrl) {
    throw new Error('Video generation failed. No video URL was returned.');
  }

  await deps.createMediaAsset({
    name: `Pipeline Video: ${visualPrompt.substring(0, 30)}...`,
    type: 'VIDEO',
    url: videoUrl,
    size: 0,
    userId: deps.userId,
  });

  return { videoUrl };
}
