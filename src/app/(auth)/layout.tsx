
'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/loading-spinner';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  React.useEffect(() => {
    if (status === 'authenticated' && session?.user) {
        if (session.user.role === 'SUPER_ADMIN') {
            router.replace('/chin/dashboard');
        } else if (session.user.role === 'ADMIN') {
            router.replace('/kanri/dashboard');
        } else if (session.user.onboardingComplete) {
            router.replace('/dashboard');
        } else {
            router.replace('/dashboard/onboarding');
        }
    }
  }, [session, status, router]);
  
  if (status === 'loading' || status === 'authenticated') {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <LoadingSpinner />
        </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {children}
    </main>
  );
}

