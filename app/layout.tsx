import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
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

export const metadata: Metadata = {
  title: 'Loving Charmz — Symbolic jewelry for the bond that lasts',
  description:
    'Handcrafted symbolic jewelry for women who want to carry meaning, memories, and connection — especially with their pets.',
  metadataBase: new URL('https://loving-charmz.vercel.app'),
  openGraph: {
    title: 'Loving Charmz',
    description: 'Handcrafted symbolic jewelry for the bond that lasts.',
    type: 'website',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfairDisplay.variable}`}>{children}</body>
    </html>
  );
}
