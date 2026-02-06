import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { randomBytes, createHash } from 'crypto';
import { sendEmail } from '@/server/services/email-service';
import { getAdminSettings } from '@/server/actions/admin-actions';
import { getBaseUrl } from '@/lib/utils';
import { createRateLimit } from '@/lib/rate-limit';

// CRITICAL: Explicitly set runtime to Node.js to prevent Edge Runtime analysis
// This fixes build errors from crypto not supported in Edge Runtime
export const runtime = 'nodejs';

// Rate limiter: 3 resend attempts per hour per IP
const resendRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  message: 'Too many verification email requests. Please try again later.'
});

export async function POST(request: Request) {
  // Apply rate limiting
  const rateLimitResult = resendRateLimit(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }
    try {
        console.log('[resend-verification] Request received');
        const { email } = await request.json();

        if (!email) {
            console.log('[resend-verification] No email provided');
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        console.log('[resend-verification] User found:', !!user);

        if (!user) {
            // Return success to prevent user enumeration
            console.log('[resend-verification] User not found, returning success');
            return NextResponse.json({ success: true });
        }

        if (user.emailVerified && user.status === 'Active') {
            console.log('[resend-verification] User already verified');
            return NextResponse.json({ error: 'Email is already verified' }, { status: 400 });
        }

        // Delete any existing verification tokens for this user
        await prisma.verificationToken.deleteMany({
            where: { identifier: email },
        });

        // Create new verification token
        const verificationToken = randomBytes(32).toString('hex');
        const hashedToken = createHash('sha256').update(verificationToken).digest('hex');
        const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await prisma.verificationToken.create({
            data: {
                identifier: email,
                token: hashedToken,
                expires: tokenExpires,
            },
        });

        // Send verification email
        const { appName } = await getAdminSettings();
        // Use getBaseUrl utility for proper URL handling
        const baseUrl = getBaseUrl(request);
        const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;
        
        console.log('[resend-verification] Verification URL generated:', verificationUrl.substring(0, 80) + '...');

        try {
            await sendEmail({
                to: email,
                templateKey: 'emailVerification',
                data: {
                    appName,
                    name: user.displayName || 'User',
                    verificationLink: verificationUrl,
                }
            });
            console.log('[resend-verification] Verification email sent to:', email);
        } catch (emailError: any) {
            console.error('Failed to send verification email:', emailError.message);
            return NextResponse.json(
                { error: 'Failed to send verification email. Please contact support.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Resend verification error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
