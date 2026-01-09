
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Debug session status
    console.log('[Landing Page] Session status:', status);
    console.log('[Landing Page] Session data:', session);
    
    if (status === 'loading') {
      return;
    }

    if (status === 'authenticated') {
      console.log('[Landing Page] Redirecting authenticated user, role:', session?.user?.role);
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
      console.log('[Landing Page] Redirecting to login');
      router.replace('/login');
    }
  }, [router, session, status]);

  // Show a loading state while checking session.
  return (
    <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
    </div>
  );
}
