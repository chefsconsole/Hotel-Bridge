import type { Metadata, Viewport } from 'next';
import { Inter, Inter_Tight } from 'next/font/google';
import Script from 'next/script';
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
      <body className="min-h-dvh">
        {children}
        {/* Vercel Web Analytics: page views and visitors, no cookies and no
          * personal data. Served by Vercel itself, so it costs no dependency.
          * It only records anything once Analytics is enabled for the project
          * in the Vercel dashboard. */}
        {process.env.VERCEL_ENV === 'production' && (
          <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
        )}
      </body>
    </html>
  );
}
