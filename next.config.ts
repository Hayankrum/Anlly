import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production'

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://server.arcgisonline.com",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://fcm.googleapis.com https://*.googleapis.com https://updates.push.services.mozilla.com https://web.push.apple.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://server.arcgisonline.com",
  "worker-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  ...(isProd ? [{ key: 'Content-Security-Policy', value: cspDirectives }] : []),
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: [
    '@prisma/client/runtime/client',
    'web-push',
  ],
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.tile.openstreetmap.org' },
    ],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: securityHeaders,
    },
    {
      source: '/_next/static/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      source: '/icons/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
      ],
    },
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
  ],
};

export default nextConfig;
