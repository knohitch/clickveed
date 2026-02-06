'use client';

import React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/server/actions/auth-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, CheckCircle2, Mail, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

function LoginButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full text-lg py-6" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing in...
        </>
      ) : (
        'Sign In'
      )}
    </Button>
  );
}

const initialState = {
  error: '',
  success: false,
};

// Component to display verification status messages
function VerificationMessage() {
  const searchParams = useSearchParams();
  const verified = searchParams.get('verified');
  const error = searchParams.get('error');
  const message = searchParams.get('message');
  
  if (verified === 'true') {
    return (
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-600">Email Verified!</AlertTitle>
        <AlertDescription className="text-green-600">
          {message === 'already_verified' 
            ? 'Your email was already verified. You can now log in.'
            : 'Your email has been successfully verified. You can now log in to your account.'}
        </AlertDescription>
      </Alert>
    );
  }
  
  if (error) {
    const errorMessages: Record<string, { title: string; description: string }> = {
      'expired_token': {
        title: 'Verification Link Expired',
        description: 'This verification link has expired or has already been used. Please try logging in - if your account is already verified, you can access it. Otherwise, request a new verification email.'
      },
      'invalid_token': {
        title: 'Invalid Verification Link',
        description: 'This verification link is invalid. Please check your email for the correct link or request a new one.'
      },
      'verification_failed': {
        title: 'Verification Failed',
        description: 'Something went wrong while verifying your email. Please try again or contact support.'
      }
    };
    
    const errorInfo = errorMessages[error] || {
      title: 'Verification Error',
      description: 'An error occurred during email verification. Please try again.'
    };
    
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{errorInfo.title}</AlertTitle>
        <AlertDescription>{errorInfo.description}</AlertDescription>
      </Alert>
    );
  }
  
  return null;
}

export function LoginForm() {
  const [state, formAction] = useFormState(login, initialState as any);

  // Handle redirect after successful login
  React.useEffect(() => {
    if (state?.success && state?.redirectUrl) {
      console.log('Login successful, redirecting to:', state.redirectUrl);
      // Use router.push for client-side navigation
      // This ensures the session cookie is set before navigation
      window.location.href = state.redirectUrl;
    }
  }, [state?.success, state?.redirectUrl]);

  return (
    <form action={formAction} className="grid gap-4">
      {/* Show verification status messages */}
      <React.Suspense fallback={null}>
        <VerificationMessage />
      </React.Suspense>
      
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          name="email"
          placeholder="m@example.com"
          required
        />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="ml-auto inline-block text-sm underline"
          >
            Forgot your password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
        />
      </div>

      {state?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Login Failed</AlertTitle>
          <AlertDescription>
            {state.error}
          </AlertDescription>
        </Alert>
      )}
      
      <LoginButton />
    </form>
  );
}
