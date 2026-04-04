import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/server/prisma';
import { getPersonaAvatarJobStatusMessage, type PersonaAvatarJobStatus } from '@/server/services/persona-avatar-job-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: { jobId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const job = await (prisma as any).personaAvatarJob.findFirst({
    where: {
      id: params.jobId,
      userId: session.user.id,
    },
  });

  if (!job) {
    return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
  }

  const jobStatus = job.status as PersonaAvatarJobStatus;

  return NextResponse.json({
    success: true,
    job: {
      id: job.id,
      jobStatus,
      videoStatus: getPersonaAvatarJobStatusMessage(jobStatus, job.errorMessage),
      avatarImageUrl: job.avatarImageUrl,
      videoUrl: job.videoUrl,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
    },
  });
}
