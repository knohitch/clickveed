import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { auth } from '@/auth';

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

    // Fetch video with project to check ownership
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { project: true },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Check ownership through the project relationship
    if (video.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Note: Video model doesn't have watchProgress/watchDuration fields
    // Return success with the provided values for client-side tracking
    return NextResponse.json({
      success: true,
      progress: progress,
      duration: duration ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update video progress' },
      { status: 500 }
    );
  }
}
