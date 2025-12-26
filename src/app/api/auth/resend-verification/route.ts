import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import { randomBytes, createHash } from 'crypto';
import { sendEmail } from '@/server/services/email-service';
import { getAdminSettings } from '@/server/actions/admin-actions';
import { getBaseUrl } from '@/lib/utils';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            // Return success to prevent user enumeration
            return NextResponse.json({ success: true });
        }

        if (user.emailVerified && user.status === 'Active') {
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
        const baseUrl = getBaseUrl(request);
        const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;

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
