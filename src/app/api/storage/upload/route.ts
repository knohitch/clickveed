import { NextRequest, NextResponse } from 'next/server';
import { deleteFromStorage, uploadToStorage } from '@/server/actions/storage-actions';
import { auth } from '@/auth';
import prisma, { withRetry } from '@/server/prisma';
import { sanitizeFilename } from '@/lib/file-upload-security';
import {
  createUnauthorizedError,
  createValidationError,
  createInternalError,
  createSuccessResponse
} from '@/lib/error-response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function resolveMediaAssetType(mimeType: string): 'IMAGE' | 'VIDEO' | 'AUDIO' | null {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Fix Bug #9: Add proper authentication check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(createUnauthorizedError(), { status: 401 });
    }

    // Wrap formData parsing in try-catch to handle malformed requests
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formDataError) {
      console.error('Failed to parse FormData:', formDataError);
      return NextResponse.json(
        createValidationError('Invalid request format. Expected multipart/form-data.'),
        { status: 400 }
      );
    }

    const file = formData.get('file') as File;

    // Fix Bug #9: Add input validation
    if (!file) {
      return NextResponse.json(createValidationError('No file provided'), { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'audio/mpeg',
      'audio/wav',
      'audio/mp3',
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(createValidationError('File type not allowed'), { status: 400 });
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(createValidationError('File size too large. Maximum 50MB allowed.'), { status: 400 });
    }

    // Get optional metadata
    const contentType = formData.get('contentType') as string;
    const metadata = formData.get('metadata') as string;

    let parsedMetadata = {};
    if (metadata) {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (e) {
        console.warn('Invalid metadata format:', e);
      }
    }

    // Upload file
    const result = await uploadToStorage(file, session.user.id, {
      contentType: contentType || file.type,
      metadata: parsedMetadata,
    });

    if (!result.success) {
      const isConfigError = result.error?.includes('not configured');
      const status = isConfigError ? 503 : 500;
      console.error('[storage-upload] Upload failed', {
        userId: session.user.id,
        status,
        error: result.error || 'Upload failed',
      });
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Upload failed',
          code: isConfigError ? 'STORAGE_NOT_CONFIGURED' : 'UPLOAD_FAILED',
          message: isConfigError
            ? 'File storage is not configured. Please contact your administrator to set up storage credentials in the admin panel.'
            : (result.error || 'Upload failed'),
        },
        { status }
      );
    }

    // Persist media uploads in DB so they appear in Media Library.
    const mediaAssetType = resolveMediaAssetType(file.type);
    let mediaAssetId: number | null = null;

    if (mediaAssetType) {
      try {
        const preferredUrl = result.data?.cdnUrl || result.data?.storageUrl;
        if (typeof preferredUrl !== 'string' || !preferredUrl.startsWith('http')) {
          throw new Error('Upload succeeded but no valid file URL was returned.');
        }

        const mediaAsset = await withRetry(
          () =>
            prisma.mediaAsset.create({
              data: {
                name: sanitizeFilename(file.name),
                type: mediaAssetType,
                url: preferredUrl,
                size: file.size / (1024 * 1024),
                userId: session.user.id,
              },
            }),
          { operationName: 'mediaAsset.create(upload)' }
        );
        mediaAssetId = mediaAsset.id;
        console.info('[storage-upload] Media asset record created', {
          userId: session.user.id,
          mediaAssetId,
          storageKey: result.data?.key,
          mimeType: file.type,
        });
      } catch (mediaError) {
        console.error('Failed to create media library record after upload:', mediaError);

        // Best-effort rollback to avoid orphan files in storage.
        const storageKey = typeof result.data?.key === 'string' ? result.data.key : null;
        if (storageKey) {
          try {
            const rollbackResult = await deleteFromStorage(storageKey, session.user.id);
            if (!rollbackResult.success) {
              console.warn('Rollback storage delete failed:', rollbackResult.error);
            }
          } catch (rollbackError) {
            console.warn('Rollback storage delete threw an error:', rollbackError);
          }
        }

        return NextResponse.json(
          {
            success: false,
            error: 'Failed to save uploaded media in the media library.',
            code: 'MEDIA_RECORD_CREATE_FAILED',
            message: 'Upload aborted because media metadata could not be stored.',
          },
          { status: 500 }
        );
      }
    }

    const responseData = {
      ...result.data,
      ...(mediaAssetId !== null ? { mediaAssetId } : {}),
    };

    if (mediaAssetType === null) {
      console.info('[storage-upload] Upload succeeded without media indexing', {
        userId: session.user.id,
        storageKey: result.data?.key,
        mimeType: file.type,
      });
    }

    // Fix Bug #10: Use standardized success response
    return NextResponse.json(createSuccessResponse(responseData, 'File uploaded successfully'), { status: 200 });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(createInternalError('Internal server error'), { status: 500 });
  }
}
