import { redirect } from 'next/navigation';

import { auth } from '@/auth';

export default async function ChinRedirect() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role === 'SUPER_ADMIN') {
    redirect('/chin/dashboard');
  }

  redirect('/dashboard');
}
