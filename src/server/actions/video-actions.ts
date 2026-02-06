
'use server';

import prisma from '@/server/prisma';
import { auth } from '@/auth';
import { generateTimedTranscript as generateTimedTranscriptFlow } from '@/server/ai/flows/generate-timed-transcript';
import { uploadToWasabi } from '@/server/services/wasabi-service';
import { requireFeatureAccess } from '@/server/actions/feature-access-service';

/**
 * Creates a new video record in the database, uploads the video file to storage,
 * and generates and saves its transcript.
 * @param videoFile The video file to process.
 * @returns The newly created video record from the database.
 */
export async function createVideoWithTranscript(videoFile: File) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("User is not authenticated.");
    }
    const userId = session.user.id;

    // Get user with plan details for usage limits
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { plan: true }
    });

    if (!user || !user.plan) {
        throw new Error("User or plan not found. Please contact support.");
    }

    // Check video exports limit
    const usage = await prisma.userUsage.findUnique({
        where: { userId }
    });
    const currentExports = usage?.projects || 0;
    const maxExports = user.plan.videoExports;

    if (maxExports !== null && currentExports >= maxExports) {
        throw new Error(`Video export limit reached. Your ${user.plan.name} plan allows ${maxExports} exports per month. Please upgrade your plan to continue.`);
    }

    // Check storage limit
    const currentStorage = usage?.storageUsedGB || 0;
    const maxStorage = user.plan.storageGB || 0;
    const fileSizeMB = videoFile.size / (1024 * 1024);
    const fileSizeGB = fileSizeMB / 1024;

    if (currentStorage + fileSizeGB > maxStorage) {
        throw new Error(`Storage limit would be exceeded. Your ${user.plan.name} plan has ${maxStorage}GB storage. Please upgrade or delete some files.`);
    }

    // 1. Upload video to Wasabi to get a public URL
    const videoDataUri = `data:${videoFile.type};base64,${Buffer.from(await videoFile.arrayBuffer()).toString('base64')}`;
    const { publicUrl: videoUrl, sizeMB } = await uploadToWasabi(videoDataUri, 'videos');
    console.log(`[VideoActions] Video uploaded successfully: ${videoUrl}`);
    
    // 2. Create a default project for the user if one doesn't exist
    let project = await prisma.project.findFirst({
        where: { userId }
    });
    
    if (!project) {
        project = await prisma.project.create({
            data: {
                title: "Default Project",
                userId,
            }
        });
    }
    
    // 3. Create the initial video record in the database
    const video = await prisma.video.create({
        data: {
            name: videoFile.name,
            url: videoUrl,
            size: sizeMB,
            projectId: project.id,
        }
    });
    
    // 3. Generate the timed transcript using the public URL
    const { transcript: timedTranscript } = await generateTimedTranscriptFlow({ videoUrl });
    
    // Format the timed transcript into a single string for storage
    const transcriptContent = timedTranscript.map(t => `[${t.start.toFixed(2)}-${t.end.toFixed(2)}] ${t.word}`).join(' ');

    // 4. Create the transcript record linked to the video
    await prisma.transcript.create({
        data: {
            content: transcriptContent,
            videoId: video.id,
            // You can also store the structured JSON data if needed
            // jsonContent: timedTranscript, 
        }
    });

    // 5. Update user usage stats
    await prisma.userUsage.upsert({
        where: { userId },
        update: {
            projects: { increment: 1 },
            storageUsedGB: { increment: sizeMB / 1024 },
        },
        create: {
            userId,
            projects: 1,
            mediaAssets: 0,
            aiCreditsUsed: 0,
            storageUsedGB: sizeMB / 1024,
        },
    });

    return video;
}
