
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
        // Post-login redirects are now handled server-side in the AuthLayout
        // This component just handles the initial unauthenticated case.
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
