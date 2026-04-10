import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import SuperAdminShell from '@/components/layouts/super-admin-shell';

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  return <SuperAdminShell user={session.user}>{children}</SuperAdminShell>;
}
