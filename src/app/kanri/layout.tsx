import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import KanriShell from '@/components/layouts/kanri-shell';

export default async function KanriLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  return <KanriShell user={session.user}>{children}</KanriShell>;
}
