

'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { signUp } from '@/server/actions/auth-actions';
import { AlertCircle, Check } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

function SignUpButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full text-lg py-6" disabled={pending}>
      {pending ? 'Creating Account...' : 'Create an Account'}
    </Button>
  );
}

const initialState = {
    error: '',
    success: false,
};

export function SignupForm() {
  const [state, formAction] = useFormState(signUp, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.push('/login?signup=success');
    }
  }, [state.success, router]);

  return (
    <>
      {state.success ? (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertTitle>Welcome!</AlertTitle>
          <AlertDescription>
            Your account has been created. Redirecting you to login...
          </AlertDescription>
        </Alert>
      ) : (
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Max Robinson" required />
          </div>
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
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {state?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sign Up Failed</AlertTitle>
              <AlertDescription>
                {typeof state.error === 'string' 
                  ? state.error 
                  : Object.values(state.error).flat().join(', ')
                }
              </AlertDescription>
            </Alert>
          )}
          <SignUpButton />
        </form>
      )}
    </>
  );
}
