import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // PGlite ships a WASM binary + filesystem image; it must not be bundled.
  serverExternalPackages: ['@electric-sql/pglite', 'postgres'],
  poweredByHeader: false,
  // KYC uploads (PAN card, GST certificate) are up to 4 MB.
  experimental: { serverActions: { bodySizeLimit: '5mb' } },
  /* www.hotelbridge.co used to be a separate marketing site with its own URLs.
   * Those links are in sent email, on the flyer and in search results, so they
   * keep working rather than 404 now that this app serves the main domain. */
  async redirects() {
    return [
      /* One canonical address. www.hotelbridge.co serves the site; the apex and
       * the old portal subdomain both send visitors there, keeping every link
       * already in circulation — email footers, the agent flyer, outreach to
       * hundreds of hotels — working, with the path preserved. */
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'hotelbridge.co' }],
        destination: 'https://www.hotelbridge.co/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'portal.hotelbridge.co' }],
        destination: 'https://www.hotelbridge.co/:path*',
        permanent: true,
      },

      { source: '/privacy', destination: '/legal/privacy', permanent: true },
      { source: '/terms', destination: '/legal/terms', permanent: true },
      { source: '/privacy-policy', destination: '/legal/privacy', permanent: true },
      { source: '/terms-and-conditions', destination: '/legal/terms', permanent: true },
      // No like-for-like page yet; the partner page is the closest match and the
      // homepage covers the rest. Port the real content and drop these.
      { source: '/about', destination: '/', permanent: false },
      { source: '/why-us', destination: '/', permanent: false },
      { source: '/whyus', destination: '/', permanent: false },
      { source: '/services', destination: '/partners', permanent: false },
      { source: '/contact', destination: '/partners', permanent: false },
      // The old site sent agents to a login of its own.
      { source: '/signin', destination: '/login', permanent: true },
      { source: '/sign-in', destination: '/login', permanent: true },
    ];
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        // Framing, form targets, plugins and base URL locked down; scripts are left to Next.js.
        { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests" },
      ],
    }];
  },
};

export default nextConfig;
