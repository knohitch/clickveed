import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { auth } from '@/auth';

type VideoWithProgress = {
  id: string;
  userId: string;
  name: string;
  url: string;
  watchProgress: number;
  watchDuration: number;
  lastWatchedAt: Date | null;
  createdAt: Date;
  transcript: { id: string; content: Json; videoId: string; createdAt: Date } | null;
};

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export async function GET(
  request: Request,
  { params }: { params: { videoId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const videoId = params.videoId;

  try {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        transcript: true,
      },
    }) as VideoWithProgress | null;

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (video.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      id: video.id,
      name: video.name,
      url: video.url,
      watchProgress: video.watchProgress,
      watchDuration: video.watchDuration,
      lastWatchedAt: video.lastWatchedAt,
      createdAt: video.createdAt,
      transcript: video.transcript,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch video data' },
      { status: 500 }
    );
  }
}
