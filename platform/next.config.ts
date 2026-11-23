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
      /* /about, /services, /why-us and /contact are real pages now, at the same
       * paths the old marketing site used, so nothing needs redirecting. These
       * are only the spellings that site never had. */
      { source: '/whyus', destination: '/why-us', permanent: true },
      { source: '/why', destination: '/why-us', permanent: true },
      { source: '/contact-us', destination: '/contact', permanent: true },
      // The old site carried the staff CRM at /crm; staff tools live under /admin.
      { source: '/crm', destination: '/admin', permanent: false },
      { source: '/crm/:path*', destination: '/admin', permanent: false },
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
