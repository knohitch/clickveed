import { redirect } from 'next/navigation';

import { auth } from '@/auth';

export default async function LandingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role === 'SUPER_ADMIN') {
    redirect('/chin/dashboard');
  }

  if (session.user.role === 'ADMIN') {
    redirect('/kanri/dashboard');
  }

  if (!session.user.onboardingComplete) {
    redirect('/dashboard/onboarding');
  }

  redirect('/dashboard');
}
