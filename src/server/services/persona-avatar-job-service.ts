import 'server-only';

import prisma from '@/server/prisma';
import { addAITask } from '@lib/queue';
import { generateVideoWithProvider } from '@/lib/ai/api-service-manager';
import { uploadToWasabi } from '@/server/services/wasabi-service';
import { sendOperationalAlert } from '@/lib/monitoring/alerts';

export const PERSONA_AVATAR_VIDEO_TASK = 'generate-persona-avatar-video';

export type PersonaAvatarJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

function extractGeneratedVideoUrl(videoResponse: unknown): string {
  const payload = videoResponse as any;
  const responseText = payload?.result?.content?.[0]?.text || '';
  if (typeof responseText === 'string' && responseText.startsWith('Video generated: ')) {
    return responseText.replace('Video generated: ', '').trim();
  }

  if (typeof payload?.videoUrl === 'string' && payload.videoUrl.length > 0) {
    return payload.videoUrl;
  }

  if (typeof payload?.media?.url === 'string' && payload.media.url.length > 0) {
    return payload.media.url;
  }

  return '';
}

export function getPersonaAvatarJobStatusMessage(
  status: PersonaAvatarJobStatus,
  errorMessage?: string | null
): string {
  switch (status) {
    case 'queued':
      return 'Avatar video has been queued for rendering.';
    case 'processing':
      return 'Avatar video is rendering in the background.';
    case 'completed':
      return 'Avatar video is ready.';
    case 'failed':
      return errorMessage || 'Avatar video generation failed.';
    default:
      return 'Avatar video status is unavailable.';
  }
}

export async function createPersonaAvatarJob(input: {
  userId: string;
  personaName: string;
  script: string;
  avatarImageUrl: string;
}) {
  return (prisma as any).personaAvatarJob.create({
    data: {
      userId: input.userId,
      personaName: input.personaName,
      script: input.script,
      avatarImageUrl: input.avatarImageUrl,
      status: 'queued',
    },
  });
}

export async function enqueuePersonaAvatarVideoJob(jobId: string): Promise<{
  jobStatus: PersonaAvatarJobStatus;
  videoStatus: string;
}> {
  const job = await addAITask(
    PERSONA_AVATAR_VIDEO_TASK,
    { jobId },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 50,
      removeOnFail: 100,
    }
  );

  if (!job) {
    const errorMessage =
      'Avatar video queue is unavailable. Configure Redis and run the worker to process persona videos.';
    await sendOperationalAlert({
      category: 'queue',
      severity: 'critical',
      event: 'persona_avatar_queue_unavailable',
      message: errorMessage,
      metadata: {
        jobId,
      },
    });
    await (prisma as any).personaAvatarJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
      },
    });

    return {
      jobStatus: 'failed',
      videoStatus: getPersonaAvatarJobStatusMessage('failed', errorMessage),
    };
  }

  return {
    jobStatus: 'queued',
    videoStatus: getPersonaAvatarJobStatusMessage('queued'),
  };
}

export async function processPersonaAvatarVideoJob(jobId: string) {
  const jobRecord = await (prisma as any).personaAvatarJob.findUnique({
    where: { id: jobId },
  });

  if (!jobRecord) {
    throw new Error(`Persona avatar job ${jobId} was not found.`);
  }

  if (jobRecord.status === 'completed' && jobRecord.videoUrl) {
    return jobRecord;
  }

  await (prisma as any).personaAvatarJob.update({
    where: { id: jobId },
    data: {
      status: 'processing',
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
      attempts: {
        increment: 1,
      },
    },
  });

  try {
    const videoResponse: any = await generateVideoWithProvider({
      messages: [
        {
          role: 'user',
          content: [
            {
              text:
                `Animate this avatar to speak naturally and stay visually consistent.\n` +
                `Persona: ${jobRecord.personaName}\n` +
                `Script: "${jobRecord.script}"\n` +
                `Image: ${jobRecord.avatarImageUrl}`,
            },
          ],
        },
      ],
    });

    const generatedVideoUrl = extractGeneratedVideoUrl(videoResponse);
    if (!generatedVideoUrl) {
      throw new Error('Video generation failed. No video URL was returned by the provider.');
    }

    const { publicUrl, sizeMB } = await uploadToWasabi(generatedVideoUrl, 'videos');

    await prisma.mediaAsset.create({
      data: {
        name: `Avatar Video: ${jobRecord.personaName}`,
        type: 'VIDEO',
        url: publicUrl,
        size: sizeMB,
        userId: jobRecord.userId,
      },
    });

    return (prisma as any).personaAvatarJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        videoUrl: publicUrl,
        errorMessage: null,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown persona avatar rendering failure';
    await sendOperationalAlert({
      category: 'ai',
      severity: 'critical',
      event: 'persona_avatar_job_failed',
      message: `Persona avatar job ${jobId} failed.`,
      userId: jobRecord.userId,
      metadata: {
        jobId,
        personaName: jobRecord.personaName,
      },
      error: error instanceof Error ? error : new Error(errorMessage),
    });

    await (prisma as any).personaAvatarJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
      },
    });

    throw error;
  }
}
