'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

type VerificationState = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<VerificationState>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');
      const isSignupSuccess = searchParams.get('signup') === 'success';

      if (isSignupSuccess && !token) {
        setState('success');
        setMessage('Account created successfully! Please check your email for the verification link.');
        return;
      }

      if (!token) {
        setState('error');
        setMessage('Invalid verification link. No token provided.');
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);

        if (response.ok) {
          setState('success');
          setMessage('Your email has been verified successfully! Redirecting to login...');

          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/login?verified=true');
          }, 3000);
        } else {
          const url = new URL(response.url);
          const error = url.searchParams.get('error');

          setState('error');
          if (error === 'expired_token') {
            setMessage('Verification link has expired. Please request a new verification email.');
          } else if (error === 'invalid_token') {
            setMessage('Invalid verification link. Please check your email for the correct link.');
          } else {
            setMessage('Verification failed. Please try again or contact support.');
          }
        }
      } catch (error) {
        setState('error');
        setMessage('Network error. Please check your connection and try again.');
      }
    };

    verifyToken();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Email Verification</CardTitle>
          <CardDescription>
            Verifying your email address...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            {state === 'loading' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                <p className="text-center text-gray-600">
                  Please wait while we verify your email...
                </p>
              </>
            )}

            {state === 'success' && (
              <>
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="text-center text-green-600 font-medium">
                  {message}
                </p>
              </>
            )}

            {state === 'error' && (
              <>
                <XCircle className="h-12 w-12 text-red-500" />
                <p className="text-center text-red-600">
                  {message}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <Button asChild className="flex-1">
                    <Link href="/login">
                      Go to Login
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="flex-1">
                    <Link href="/forgot-password">
                      Request New Link
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
