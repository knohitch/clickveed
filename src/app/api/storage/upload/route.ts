import { NextRequest, NextResponse } from 'next/server';
import { uploadToStorage } from '@/server/actions/storage-actions';
import { auth } from '@/auth';
import {
  createUnauthorizedError,
  createValidationError,
  createInternalError,
  createSuccessResponse
} from '@/lib/error-response';

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

    // Fix Bug #10: Use standardized success response
    return NextResponse.json(createSuccessResponse(result.data, 'File uploaded successfully'), { status: 200 });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(createInternalError('Internal server error'), { status: 500 });
  }
}
