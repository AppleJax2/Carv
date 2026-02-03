import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';

export const metadata: Metadata = {
  title: {
    default: 'Carv - CNC Design Software That Just Works',
    template: '%s | Carv'
  },
  description: 'Professional CNC design software with toolpath generation, 3D simulation, and machine control. Free forever for core features. No subscription required.',
  keywords: ['CNC', 'CAD', 'CAM', 'design software', 'toolpath', 'G-code', 'GRBL', 'woodworking', 'CNC router', 'milling'],
  authors: [{ name: 'Carv' }],
  creator: 'Carv',
  publisher: 'Carv',
  metadataBase: new URL(process.env.BASE_URL || 'https://carv.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Carv',
    title: 'Carv - CNC Design Software That Just Works',
    description: 'Professional CNC design software with toolpath generation, 3D simulation, and machine control. Free forever for core features.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Carv - CNC Design Software'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Carv - CNC Design Software That Just Works',
    description: 'Professional CNC design software with toolpath generation, 3D simulation, and machine control. Free forever.',
    images: ['/og-image.png'],
    creator: '@carvapp'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png'
  },
  manifest: '/site.webmanifest'
};

export const viewport: Viewport = {
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' }
  ]
};

const manrope = Manrope({ subsets: ['latin'] });

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`bg-background text-foreground ${manrope.className}`}
    >
      <body className="min-h-[100dvh] bg-background">
        <SWRConfig
          value={{
            fallback: {
              '/api/user': getUser(),
              '/api/team': getTeamForUser()
            }
          }}
        >
          {children}
        </SWRConfig>
      </body>
    </html>
  );
}
