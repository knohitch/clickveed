import type { Metadata } from 'next';
import { Nunito, Poppins } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import ClientLayout from '@/components/client-layout';
import { getAdminSettings } from '@/server/actions/admin-actions';

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
  // Only generate dynamic metadata if DATABASE_URL is available (runtime)
  if (process.env.DATABASE_URL) {
    try {
      const { appName } = await getAdminSettings();
      return {
        title: appName,
        description: 'The All-in-One AI Video Creation Suite',
      };
    } catch (error) {
      // Fallback on database errors during build time
      console.warn('Failed to fetch dynamic metadata:', error);
    }
  }

  // Fallback static metadata for build time
  return {
    title: 'ClickVid',
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
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
