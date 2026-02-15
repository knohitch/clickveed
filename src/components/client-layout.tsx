'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from '@/components/ui/toaster';
import AppInitializer from '@/components/app-initializer';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AppInitializer>
        {children}
      </AppInitializer>
      <Toaster />
    </SessionProvider>
  );
}