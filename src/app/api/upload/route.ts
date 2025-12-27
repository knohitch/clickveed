'use server';

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
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file security
    const securityResult = validateFile(file, 'video');
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
    const { publicUrl } = await uploadToWasabi(dataUri, 'videos');

    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        name: sanitizedFilename,
        type: 'VIDEO',
        url: publicUrl,
        size: sizeMB,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, assetId: mediaAsset.id });
  } catch (error) {
    logError(error as Error, 'File upload failed');
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
