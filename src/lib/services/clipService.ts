

'use server';
/**
 * @fileOverview A service module for managing video clips and transcripts.
 */

import prisma from '../prisma';

/**
 * Retrieves a video and its transcript from the database.
 * @param videoId The ID of the video to retrieve.
 * @returns An object containing the video's title and its transcript, or null if not found.
 */
export async function getVideoWithTranscript(videoId: string): Promise<{ title: string; transcript: string } | null> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
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
