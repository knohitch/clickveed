
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
        const isSuperAdmin = userCount === 0;
        const role = isSuperAdmin ? 'SUPER_ADMIN' : 'USER';
        
        // Find the default "Free" plan
        const freePlan = await prisma.plan.findFirst({
            where: { name: 'Free' }
        });
        if (!freePlan) {
             console.error("Default 'Free' plan not found. Available plans:", await prisma.plan.findMany({ select: { name: true } }));
             throw new Error("Default 'Free' plan not found. Please seed the database.");
        }

        if (isSuperAdmin) {
            // Super Admin: Auto-verify and set to Active
            await prisma.user.create({
                data: {
                    email,
                    displayName: name,
                    passwordHash,
                    role,
                    status: 'Active',
                    emailVerified: true,
                    planId: freePlan.id,
                },
            });

            console.log(`Super Admin ${email} signed up successfully and auto-verified.`);
            
            return { success: true, error: '', isSuperAdmin: true };
        } else {
            // Regular User: Requires email verification
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

            await prisma.user.create({
                data: {
                    email,
                    displayName: name,
                    passwordHash,
                    role,
                    status: 'Pending',
                    emailVerified: false,
                    planId: freePlan.id,
                },
            });

            // Send verification email
            const { appName } = await getAdminSettings();
            const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${verificationToken}`;

            let emailError = '';
            try {
                await sendEmail({
                    to: email,
                    templateKey: 'emailVerification',
                    data: {
                        appName,
                        name,
                        verificationLink: verificationUrl,
                    }
                });

                // Send signup confirmation email to user
                await sendEmail({
                    to: email,
                    templateKey: 'userSignup',
                    data: {
                        appName,
                        name,
                    }
                });

                console.log(`User ${email} signed up successfully. Verification and confirmation emails sent.`);

                // Send notification to admin about new user signup
                const adminSettings = await getAdminSettings();
                await sendEmail({
                    to: 'admin',
                    templateKey: 'adminNewUser',
                    data: {
                        appName: adminSettings.appName,
                        userEmail: email,
                        userName: name,
                    }
                });
            } catch (error: any) {
                console.error('Failed to send signup emails:', error.message);
                emailError = 'Account created but verification email could not be sent. Please contact support or check SMTP settings.';
            }

            return { success: true, error: emailError, isSuperAdmin: false };
        }

    } catch (error: any) {
        return { error: `An unexpected error occurred: ${error.message}`, success: false };
    }
}


export async function login(prevState: any, formData: FormData) {
    try {
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        
        if (!email || !password) {
            return { error: 'Email and password are required.', success: false };
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { error: 'Please enter a valid email address.', success: false };
        }
        
        console.log(`Login attempt for: ${email}`);
        
        // Sign in without a race condition with the middleware
        const result = await signIn('credentials', {
            email,
            password,
            redirect: false, // Don't redirect here, let middleware handle it
        });
        
        if (result?.error) {
            return { error: 'Invalid email or password', success: false };
        }
        
        // Check user role to determine redirect
        const user = await prisma.user.findUnique({
            where: { email },
            select: { role: true }
        });
        
        // Successful login - redirect based on role
        if (user?.role === 'SUPER_ADMIN') {
            console.log('Redirecting SUPER_ADMIN to /chin/dashboard');
            return redirect('/chin/dashboard');
        } else if (user?.role === 'ADMIN') {
            return redirect('/kanri/dashboard');
        } else {
            return redirect('/dashboard');
        }
        
    } catch (error: any) {
        console.error('Login error:', error);
        
        // Handle timeout specifically
        if (error?.message === 'Login timeout') {
            return {
                error: 'Login is taking too long. Please check your connection and try again.',
                success: false
            };
        }
        
        // NextAuth throws redirect errors for successful logins
        if (error?.message?.includes('NEXT_REDIRECT')) {
            throw error; // Re-throw redirect errors (this is success)
        }
        
        if (error instanceof AuthError) {
          switch (error.type) {
            case 'CredentialsSignin':
              return { error: 'Invalid email or password. Please check your credentials and try again.', success: false };
            case 'CallbackRouteError':
              return { error: 'Authentication callback failed. Please try again.', success: false };
            case 'AccessDenied':
              return { error: 'Access denied. Please contact support if this persists.', success: false };
            default:
              console.error('AuthError type:', error.type);
              return { error: 'An authentication error occurred. Please try again.', success: false };
          }
        }
        
        // Handle network/connection errors
        if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
            return {
                error: 'Unable to connect to authentication service. Please check your connection.',
                success: false
            };
        }
        
        return { error: 'An unexpected error occurred during login. Please try again.', success: false };
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

            try {
                await sendEmail({
                    to: email,
                    templateKey: 'passwordReset',
                    data: {
                        appName,
                        name: user.displayName || 'User',
                        resetLink: resetLink,
                    }
                });
            } catch (emailError: any) {
                console.error('Failed to send password reset email:', emailError.message);
                // Return error since user needs the email to reset password
                return { error: 'Password reset email could not be sent. Please contact support or try again later.', success: false };
            }
        }

        // Always return success to prevent user enumeration (if user doesn't exist)
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
        
        return { success: true, error: '' };
        
    } catch(e) {
        return { error: 'An unexpected error occurred.', success: false };
    }
}
