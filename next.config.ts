import type { NextConfig } from 'next';

/**
 * Security headers applied to every response.
 *
 * Content-Security-Policy is the load-bearing one: it pins script, style,
 * image, and frame origins to exactly what the site needs. Square's embedded
 * card form loads its SDK from web.squarecdn.com (sandbox variant included)
 * and frames itself from the Square origin, so both are explicitly allowed —
 * `frame-ancestors 'none'` still applies to everyone else embedding US.
 */
/**
 * Dev builds get 'unsafe-eval' (React's dev-mode call-stack reconstruction and
 * Turbopack's HMR need it). Production keeps the strict list — React never
 * uses eval() in production, so shoppers get the tighter policy.
 */
const isDev = process.env.NODE_ENV === 'development';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://web.squarecdn.com https://sandbox.web.squarecdn.com`,
  "style-src 'self' 'unsafe-inline' https://web.squarecdn.com https://sandbox.web.squarecdn.com",
  "img-src 'self' data: https://images.unsplash.com https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://connect.squareup.com https://connect.squareupsandbox.com https://pci-connect.squareup.com https://pci-connect.squareupsandbox.com",
  "frame-src https://web.squarecdn.com https://sandbox.web.squarecdn.com https://www.squareup.com https://sandbox.squareup.com",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
