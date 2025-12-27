
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestPasswordResetAction } from '@/server/actions/auth-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Check } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full text-lg py-6" disabled={pending}>
      {pending ? 'Sending Link...' : 'Send Reset Link'}
    </Button>
  );
}

const initialState = {
  error: '',
  success: false,
};

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(
    requestPasswordResetAction,
    initialState
  );

  return (
    <>
      {state.success ? (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertTitle>Check Your Email</AlertTitle>
          <AlertDescription>
            A password reset link has been sent to your email address if an
            account exists.
          </AlertDescription>
        </Alert>
      ) : (
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
            />
          </div>
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <SubmitButton />
        </form>
      )}
    </>
  );
}
