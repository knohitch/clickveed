
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export async function generateMetadata() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'AI Video Creator';
  return {
    title: `Reset Password | ${appName}`,
  };
}

function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    )
}

export default ResetPasswordPage;
