
'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { z } from 'zod';
import { hash, compare } from 'bcryptjs';
import prisma from '@/server/prisma';
import { redirect } from 'next/navigation';
import { randomBytes, createHash } from 'crypto';
import { sendEmail } from '@/server/services/email-service';
import { getAdminSettings } from '@/server/actions/admin-actions';

const signUpSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
});

export async function signUp(prevState: any, formData: FormData) {
    const validatedFields = signUpSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            error: validatedFields.error.flatten().fieldErrors,
            success: false,
        };
    }
    
    const { name, email, password } = validatedFields.data;

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return { error: 'An account with this email already exists.', success: false };
        }

        const passwordHash = await hash(password, 10);

        // Check if this is the first user signing up
        const userCount = await prisma.user.count();
        const role = userCount === 0 ? 'SUPER_ADMIN' : 'USER';
        
        // Find the default "Free" plan
        const freePlan = await prisma.plan.findFirst({
            where: { name: 'Free' }
        });
        if (!freePlan) {
             throw new Error("Default 'Free' plan not found. Please seed the database.");
        }


        await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role,
                status: 'Active',
                planId: freePlan.id,
            },
        });

        // TODO: Implement email verification logic here.
        // For now, we'll just log a success message.
        console.log(`User ${email} signed up successfully.`);
        
        return { success: true, error: '' };

    } catch (error: any) {
        return { error: `An unexpected error occurred: ${error.message}`, success: false };
    }
}


export async function login(prevState: any, formData: FormData) {
    try {
        await signIn('credentials', Object.fromEntries(formData));
        // The redirect will be handled automatically by the auth middleware if successful.
        // This return is mainly for type safety and won't be reached on success.
        return { success: true, error: ''};
    } catch (error) {
        if (error instanceof AuthError) {
          switch (error.type) {
            case 'CredentialsSignin':
              return { error: 'Invalid email or password.', success: false };
            default:
              return { error: 'An unknown error occurred.', success: false };
          }
        }
        // IMPORTANT: If we re-throw the error, Next.js will redirect to a generic error page.
        // We return an error message to display it on the login form instead.
        return { error: 'An unexpected error occurred during login.', success: false };
    }
}

function hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
}

export async function requestPasswordResetAction(prevState: any, formData: FormData) {
    const email = formData.get('email') as string;
    if (!email) {
        return { error: 'Email is required.', success: false };
    }
    
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
            const token = randomBytes(32).toString('hex');
            const passwordResetToken = hashToken(token);
            const passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour from now

            await prisma.user.update({
                where: { email },
                data: { passwordResetToken, passwordResetExpires },
            });
            
            const { appName } = await getAdminSettings();
            const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
            
            await sendEmail({
                to: email,
                templateKey: 'passwordReset',
                data: {
                    appName,
                    name: user.name || 'User',
                    resetLink: resetLink,
                }
            });
        }
        
        // Always return success to prevent user enumeration
        return { success: true, error: '' };

    } catch (e) {
        return { error: 'An unexpected error occurred.', success: false };
    }
}

export async function resetPasswordAction(prevState: any, formData: FormData) {
    const password = formData.get('password') as string;
    const token = formData.get('token') as string;

    if (!token || !password) {
        return { error: 'Invalid request.', success: false };
    }

    try {
        const hashedToken = hashToken(token);
        
        const userToUpdate = await prisma.user.findFirst({
            where: {
                passwordResetToken: hashedToken,
                passwordResetExpires: {
                    gt: new Date(),
                },
            },
        });

        if (!userToUpdate) {
            return { error: 'Invalid or expired password reset token.', success: false };
        }
        
        const passwordHash = await hash(password, 10);

        await prisma.user.update({
            where: { id: userToUpdate.id },
            data: {
                passwordHash,
                passwordResetToken: null,
                passwordResetExpires: null,
            },
        });
        
    } catch(e) {
        return { error: 'An unexpected error occurred.', success: false };
    }

    redirect('/login');
}
