
'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/loading-spinner';
import { ThemeSwitcher } from '@/components/theme-switcher';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [redirecting, setRedirecting] = React.useState(false);
  const [loadingTimeout, setLoadingTimeout] = React.useState(false);

  // Set a timeout for loading state to prevent infinite loading
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (status === 'loading') {
        setLoadingTimeout(true);
        console.warn('Session loading timeout - this may indicate a connection issue');
      }
    }, 5000); // 5 second timeout for faster testing

    return () => clearTimeout(timer);
  }, [status]);

  React.useEffect(() => {
    if (status === 'authenticated' && session?.user && !redirecting) {
      setRedirecting(true);
      
      try {
        if (session.user.role === 'SUPER_ADMIN') {
          router.replace('/chin/dashboard');
        } else if (session.user.role === 'ADMIN') {
          router.replace('/kanri/dashboard');
        } else if (session.user.onboardingComplete) {
          router.replace('/dashboard');
        } else {
          router.replace('/dashboard/onboarding');
        }
      } catch (error) {
        console.error('Navigation error:', error);
        setRedirecting(false);
      }
    }
  }, [session, status, router, redirecting]);

  // Handle loading timeout
  if (loadingTimeout) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="fixed top-4 right-4 z-50">
          <ThemeSwitcher />
        </div>
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Taking longer than expected to load...
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Refresh Page
          </button>
        </div>
      </main>
    );
  }
  
  if (status === 'loading' || (status === 'authenticated' && redirecting)) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <LoadingSpinner />
            {redirecting && (
              <p className="mt-4 text-sm text-muted-foreground">
                Redirecting to dashboard...
              </p>
            )}
        </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Theme Switcher positioned in top-right corner */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeSwitcher />
      </div>
      {children}
    </main>
  );
}
