
import { redirect } from 'next/navigation';

import { auth } from '@/auth';

export default async function KanriRedirect() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN') {
    redirect('/kanri/dashboard');
  }

  redirect('/dashboard');
}
