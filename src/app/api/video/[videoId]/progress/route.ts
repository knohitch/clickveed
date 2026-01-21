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
};

export async function PATCH(
  request: Request,
  { params }: { params: { videoId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const videoId = params.videoId;

  try {
    const body = await request.json();
    const { progress, duration } = body;

    if (typeof progress !== 'number' || progress < 0) {
      return NextResponse.json({ error: 'Invalid progress value' }, { status: 400 });
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
    }) as VideoWithProgress | null;

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Check if video belongs to user
    if (video.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: {
      watchProgress: number;
      lastWatchedAt: Date;
      watchDuration?: number;
    } = {
      watchProgress: progress,
      lastWatchedAt: new Date(),
    };

    if (typeof duration === 'number' && duration > 0) {
      updateData.watchDuration = duration;
    }

    const updatedVideo = await prisma.video.update({
      where: { id: videoId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      progress: updatedVideo.watchProgress,
      duration: updatedVideo.watchDuration,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update video progress' },
      { status: 500 }
    );
  }
}
