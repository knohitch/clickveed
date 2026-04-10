'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import { Toaster } from '@/components/ui/toaster';
import AppInitializer from '@/components/app-initializer';

export default function ClientLayout({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider session={session}>
      <AppInitializer>
        {children}
      </AppInitializer>
      <Toaster />
    </SessionProvider>
  );
}
