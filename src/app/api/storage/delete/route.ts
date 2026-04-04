import { NextRequest, NextResponse } from 'next/server';
import { deleteFromStorage } from '@/server/actions/storage-actions';
import { auth } from '@/auth';
import { logAuditEvent } from '@/lib/monitoring/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      logAuditEvent({
        action: 'storage_file_delete',
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

    if (!key) {
      return NextResponse.json(
        { error: 'File key is required' },
        { status: 400 }
      );
    }

    // Delete file from storage
    const result = await deleteFromStorage(key, session.user.id);

    if (!result.success) {
      const status = result.error === 'Forbidden' ? 403 : 500;
      return NextResponse.json(
        { error: result.error || 'Delete failed' },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete API error:', error);
    logAuditEvent({
      action: 'storage_file_delete',
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
