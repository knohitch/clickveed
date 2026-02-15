
'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ThemeSwitcher } from '@/components/theme-switcher';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [redirecting, setRedirecting] = React.useState(false);

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
