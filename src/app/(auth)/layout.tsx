import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ThemeSwitcher } from '@/components/theme-switcher';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === 'SUPER_ADMIN') {
      redirect('/chin/dashboard');
    }
    if (session.user.role === 'ADMIN') {
      redirect('/kanri/dashboard');
    }
    if (session.user.onboardingComplete) {
      redirect('/dashboard');
    }
    redirect('/dashboard/onboarding');
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
