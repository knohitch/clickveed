
'use client';

import { useSearchParams } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPasswordAction } from '@/server/actions/auth-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Logo } from '@/components/logo';
import Link from 'next/link';

function ResetPasswordButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full text-lg py-6" disabled={pending}>
      {pending ? 'Setting Password...' : 'Set New Password'}
    </Button>
  );
}

const initialState = {
  error: '',
  success: false,
};

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, formAction] = useFormState(resetPasswordAction, initialState);

  if (!token) {
    return (
        <Card className="mx-auto max-w-sm">
             <CardHeader className="text-center">
                <CardTitle className="text-2xl">Invalid Token</CardTitle>
                <CardDescription>
                The password reset link is invalid or has expired. Please request a new one.
                </CardDescription>
            </CardHeader>
             <CardContent>
                <Button asChild className="w-full">
                    <Link href="/forgot-password">Request New Link</Link>
                </Button>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-sm w-full">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
            <Logo size="large" />
        </div>
        <CardTitle className="text-2xl">Set Your Password</CardTitle>
        <CardDescription>
          Enter a new password for your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="token" value={token} />
          <div className="grid gap-2">
            <Label htmlFor="password">New Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
           {state?.error && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
            </Alert>
            )}
          <ResetPasswordButton />
        </form>
      </CardContent>
    </Card>
  );
}
