import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/server/services/email-service';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication - admins and super admins can test emails
    const session = await auth();
    if (!session?.user?.id || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { testEmail } = body;

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Test email address is required' },
        { status: 400 }
      );
    }

    // Send a test email using the current configuration
    await sendEmail({
      to: testEmail,
      templateKey: 'userSignup',
      data: {
        name: 'Test User',
        appName: 'Test App',
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully'
    });

  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}
