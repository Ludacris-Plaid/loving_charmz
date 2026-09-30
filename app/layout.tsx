import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { SITE_URL } from '@/lib/site';
import './globals.css';

// Fonts are committed to the repo as woff2 and loaded with next/font/local
// rather than next/font/google. The Google variant re-downloads every font
// from fonts.gstatic.com on each build; when that fetch failed the whole
// build died with "Module not found: [next]/internal/font/google/…". These
// are the same variable font files, served from our own origin.
const inter = localFont({
  src: './fonts/Inter-Variable.woff2',
  weight: '100 900',
  style: 'normal',
  variable: '--font-sans',
  display: 'swap',
});

const playfairDisplay = localFont({
  src: './fonts/PlayfairDisplay-Variable.woff2',
  weight: '400 900',
  style: 'normal',
  variable: '--font-display',
  display: 'swap',
});

const caveat = localFont({
  src: './fonts/Caveat-Variable.woff2',
  weight: '400 700',
  style: 'normal',
  variable: '--font-handwriting',
  display: 'swap',
});

// Cormorant Garamond — the elegant serif for quiet supporting lines
// (hero subheadline). Pairs with Playfair Display without competing.
const cormorant = localFont({
  src: [
    {
      path: './fonts/CormorantGaramond-Variable.woff2',
      weight: '500 600',
      style: 'normal',
    },
    {
      path: './fonts/CormorantGaramond-Variable-italic.woff2',
      weight: '500 600',
      style: 'italic',
    },
  ],
  variable: '--font-serif-accent',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Loving Charmz — Symbolic jewelry for the bond that lasts',
  description:
    'Handcrafted symbolic jewelry for women who want to carry meaning, memories, and connection — especially with their pets.',
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: 'Loving Charmz',
    description: 'Handcrafted symbolic jewelry for the bond that lasts.',
    type: 'website',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfairDisplay.variable} ${caveat.variable} ${cormorant.variable}`}>{children}</body>
    </html>
  );
}
