

'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/server/actions/auth-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

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

export function LoginForm() {
  const [state, formAction] = useFormState(login, initialState);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Reset retry count on successful state change
  useEffect(() => {
    if (state?.success) {
      setRetryCount(0);
      setIsRetrying(false);
    }
  }, [state?.success]);

  const handleRetry = async (formData: FormData) => {
    if (retryCount < 3) {
      setIsRetrying(true);
      setRetryCount(prev => prev + 1);
      
      // Add a small delay before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      formAction(formData);
      setIsRetrying(false);
    }
  };

  const enhancedFormAction = async (formData: FormData) => {
    try {
      await formAction(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      // If there's a network error or timeout, offer retry
      if (retryCount < 3) {
        await handleRetry(formData);
      }
    }
  };

  return (
    <form action={enhancedFormAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          name="email"
          placeholder="m@example.com"
          required
          disabled={isRetrying}
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
          disabled={isRetrying}
        />
      </div>

      {state?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Login Failed</AlertTitle>
          <AlertDescription>
            {state.error}
            {retryCount > 0 && retryCount < 3 && (
              <div className="mt-2 text-sm">
                Attempt {retryCount + 1} of 3. Please try again.
              </div>
            )}
            {retryCount >= 3 && (
              <div className="mt-2 text-sm">
                Maximum retry attempts reached. Please check your connection and try again later.
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isRetrying && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Retrying...</AlertTitle>
          <AlertDescription>
            Attempting to sign in again. Please wait.
          </AlertDescription>
        </Alert>
      )}
      
      <LoginButton />
    </form>
  );
}
