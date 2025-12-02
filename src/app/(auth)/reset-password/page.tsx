
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { getAdminSettings } from '@/server/actions/admin-actions';

export async function generateMetadata() {
  const { appName } = await getAdminSettings();
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
