import { NextRequest, NextResponse } from 'next/server';
import { storageManager } from '@/lib/storage';
import { getUserOwnedStorageKey } from '@/lib/storage-key-utils';
import { auth } from '@/auth';
import { logAuditEvent } from '@/lib/monitoring/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      logAuditEvent({
        action: 'storage_file_download',
        outcome: 'denied',
        targetType: 'storage_file',
        metadata: {
          reason: 'anonymous_request',
        },
      });
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

    const ownedKey = getUserOwnedStorageKey(key, session.user.id);
    if (!ownedKey) {
      logAuditEvent({
        action: 'storage_file_download',
        outcome: 'denied',
        actorId: session.user.id,
        actorRole: session.user.role,
        targetType: 'storage_file',
        targetId: key,
      });
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
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
        fileUrl = storageManager.getCdnUrl(ownedKey);
      } else {
        fileUrl = storageManager.getFileUrl(ownedKey);
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to generate file URL' },
        { status: 500 }
      );
    }

    // For security, we return the URL rather than proxying the file
    // The frontend can then use this URL to display/download the file
    logAuditEvent({
      action: 'storage_file_download',
      outcome: 'success',
      actorId: session.user.id,
      actorRole: session.user.role,
      targetType: 'storage_file',
      targetId: ownedKey,
      metadata: {
        useCDN,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        key: ownedKey,
        useCDN: useCDN
      },
      message: 'File URL generated successfully'
    });

  } catch (error) {
    console.error('Download API error:', error);
    logAuditEvent({
      action: 'storage_file_download',
      outcome: 'failure',
      targetType: 'storage_file',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
