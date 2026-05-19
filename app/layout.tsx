import { Suspense, ReactNode } from 'react';
import './globals.css';
import AppShell from '@/components/AppShell';

export const metadata = {
  title: 'KaiStream - Watch Anime Online, Free Anime Streaming',
  description:
    'KaiStream is a free anime streaming site. Watch anime online in HD quality with English sub or dub.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Suspense fallback={null}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
