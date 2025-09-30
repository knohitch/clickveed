import type { Metadata } from 'next';
import { Nunito, Poppins } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { SessionProvider } from 'next-auth/react';
import AppInitializer from '@/components/app-initializer';
import { getAdminSettings } from '@/server/actions/admin-actions';
// Removed ThemeProvider import as it's already in AppInitializer

const nunito = Nunito({ 
  subsets: ['latin'], 
  variable: '--font-nunito',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const { appName } = await getAdminSettings();
  
  return {
    title: appName,
    description: 'The All-in-One AI Video Creation Suite',
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("font-body antialiased", nunito.variable, poppins.variable)}>
        <SessionProvider>
          <AppInitializer>
            {children}
          </AppInitializer>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
