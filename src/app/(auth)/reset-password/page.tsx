
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { getBrandingMetadata } from '@/lib/branding-metadata';

export async function generateMetadata() {
  const { appName } = await getBrandingMetadata();
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
