import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { auth } from '@/auth';

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
    });

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
    console.error('Error fetching video:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video data' },
      { status: 500 }
    );
  }
}
