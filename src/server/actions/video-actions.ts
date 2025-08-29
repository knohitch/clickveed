
'use server';

import prisma from '@/server/prisma';
import { auth } from '@/auth';
import { generateTimedTranscript as generateTimedTranscriptFlow } from '@/server/ai/flows/generate-timed-transcript';
import { uploadToWasabi } from '@/server/services/wasabi-service';

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

    // 1. Upload video to Wasabi to get a public URL
    const videoDataUri = `data:${videoFile.type};base64,${Buffer.from(await videoFile.arrayBuffer()).toString('base64')}`;
    const { publicUrl: videoUrl, sizeMB } = await uploadToWasabi(videoDataUri, 'videos');
    
    // 2. Create the initial video record in the database
    const video = await prisma.video.create({
        data: {
            name: videoFile.name,
            url: videoUrl,
            size: sizeMB,
            userId,
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

    return video;
}
