import type { Metadata } from 'next';
import { Inter, Playfair_Display, Caveat, Cormorant_Garamond } from 'next/font/google';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-handwriting',
  display: 'swap',
});

// Cormorant Garamond — the elegant serif for quiet supporting lines
// (hero subheadline). Pairs with Playfair Display without competing.
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
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
