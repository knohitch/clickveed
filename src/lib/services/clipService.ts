
'use server';
/**
 * @fileOverview A service module for managing video clips and transcripts.
 */

import { auth } from '@/auth';
import prisma from '@/server/prisma';

async function resolveClipAccessScope() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session.user.role || '');
  return {
    isAdmin,
    userId: session.user.id,
  };
}

/**
 * Retrieves a video and its transcript from the database.
 * @param videoId The ID of the video to retrieve.
 * @returns An object containing the video's title and its transcript, or null if not found.
 */
export async function getVideoWithTranscript(videoId: string): Promise<{ title: string; transcript: string } | null> {
  const { isAdmin, userId } = await resolveClipAccessScope();

  const video = await prisma.video.findFirst({
    where: isAdmin
      ? { id: videoId }
      : {
          id: videoId,
          project: {
            userId,
          },
        },
    include: {
      transcript: true,
    },
  });

  if (!video || !video.transcript) {
    return null;
  }

  return {
    title: video.name,
    transcript: video.transcript.content,
  };
}
