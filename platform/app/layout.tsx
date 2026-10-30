import type { Metadata, Viewport } from 'next';
import { Inter, Inter_Tight } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const interTight = Inter_Tight({ subsets: ['latin'], variable: '--font-inter-tight', display: 'swap', weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: { default: 'HotelBridge — Curated B2B hotel distribution', template: '%s · HotelBridge' },
  description: 'HotelBridge connects travel professionals with carefully selected hotel partners: contracted B2B rates, clear conditions, and a dedicated group desk.',
  icons: { icon: '/mark.svg' },
};

export const viewport: Viewport = { themeColor: '#0b1220' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
