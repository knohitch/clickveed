
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'authenticated') {
      // Redirect authenticated users based on role and onboarding status
      if (session?.user?.role === 'SUPER_ADMIN') {
        router.replace('/chin/dashboard');
      } else if (session?.user?.role === 'ADMIN') {
        router.replace('/kanri/dashboard');
      } else if (session?.user?.onboardingComplete) {
        router.replace('/dashboard');
      } else {
        router.replace('/dashboard/onboarding');
      }
      return;
    }
    
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [router, session, status]);

  // Show a loading state while checking the session.
  return (
    <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
    </div>
  );
}
