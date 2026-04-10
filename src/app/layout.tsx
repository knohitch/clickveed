import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Poppins } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import ClientLayout from '@/components/client-layout';
import { auth } from '@/auth';
import { getBrandingMetadata } from '@/lib/branding-metadata';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700'],
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
      <head>
        {/* Inline script: apply theme class before first paint — eliminates flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})()` }} />
      </head>
      <body className={cn('font-body antialiased', jakarta.variable, poppins.variable)}>
        <ClientLayout session={session}>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
