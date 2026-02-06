import { NextRequest, NextResponse } from 'next/server';
import { storageManager } from '@/lib/storage';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const useCDN = searchParams.get('cdn') !== 'false'; // Default to true

    if (!key) {
      return NextResponse.json(
        { error: 'File key is required' },
        { status: 400 }
      );
    }

    // Check if storage is configured
    if (!storageManager.isConfigured()) {
      return NextResponse.json(
        { error: 'Storage not configured' },
        { status: 500 }
      );
    }

    // Generate the appropriate URL
    let fileUrl: string;
    try {
      if (useCDN) {
        fileUrl = storageManager.getCdnUrl(key);
      } else {
        fileUrl = storageManager.getFileUrl(key);
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to generate file URL' },
        { status: 500 }
      );
    }

    // For security, we return the URL rather than proxying the file
    // The frontend can then use this URL to display/download the file
    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        key: key,
        useCDN: useCDN
      },
      message: 'File URL generated successfully'
    });

  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
