import type { Metadata } from 'next';
import { Inter, Nunito, Poppins } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import ClientLayout from '@/components/client-layout';
import { auth } from '@/auth';
import { getBrandingMetadata } from '@/lib/branding-metadata';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600'],
  display: 'swap',
});

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
  const branding = await getBrandingMetadata();
  return {
    applicationName: branding.appName,
    title: {
      default: branding.appName,
      template: `%s | ${branding.appName}`,
    },
    description: branding.description,
    ...(branding.faviconUrl
      ? {
          icons: {
            icon: branding.faviconUrl,
            shortcut: branding.faviconUrl,
            apple: branding.faviconUrl,
          },
        }
      : {}),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("font-body antialiased", inter.variable, nunito.variable, poppins.variable)}>
        <ClientLayout session={session}>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
