import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { uploadToWasabi } from '@/server/services/wasabi-service';
import prisma from '@/server/prisma';
import { logError } from '@/lib/error-handler';
import { validateFile, sanitizeFilename } from '@/lib/file-upload-security';

const MAX_FILE_SIZE_MB = 100; // Limit upload to 100MB

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Wrap formData parsing in try-catch to handle malformed requests
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formDataError) {
      console.error('Failed to parse FormData:', formDataError);
      return NextResponse.json(
        { error: 'Invalid request format. Expected multipart/form-data.' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file security - detect type from MIME
    const fileCategory = file.type.startsWith('image/') ? 'image'
      : file.type.startsWith('video/') ? 'video'
        : file.type.startsWith('audio/') ? 'audio'
          : 'document';
    const securityResult = validateFile(file, fileCategory);
    if (!securityResult.isValid) {
      return NextResponse.json({ error: securityResult.error }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const sizeMB = bytes.byteLength / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      return NextResponse.json({ error: 'File too large. Max 100MB.' }, { status: 400 });
    }

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(file.name);

    const dataUri = `data:${file.type};base64,${Buffer.from(bytes).toString('base64')}`;
    const uploadFolder = fileCategory === 'image' ? 'images' : fileCategory === 'audio' ? 'audio' : 'videos';
    const { publicUrl } = await uploadToWasabi(dataUri, uploadFolder);

    const assetType = fileCategory === 'image' ? 'IMAGE' : fileCategory === 'audio' ? 'AUDIO' : 'VIDEO';
    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        name: sanitizedFilename,
        type: assetType,
        url: publicUrl,
        size: sizeMB,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, assetId: mediaAsset.id, url: publicUrl });
  } catch (error) {
    logError(error as Error, 'File upload failed');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Upload] Error details:', errorMessage);
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: errorMessage 
    }, { status: 500 });
  }
}