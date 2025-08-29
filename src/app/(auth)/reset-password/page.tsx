
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    )
}

export default ResetPasswordPage;
