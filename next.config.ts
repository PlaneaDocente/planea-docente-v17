import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'planea-docente-v17-eight.vercel.app',
          },
        ],
        destination: 'https://www.planeadocente.com/:path*',
        permanent: true,
      },
    ];
  },
  // ✅ Headers CSP para permitir WebSocket y APIs externas
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.stripe.com https://*.supabase.co",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://*.supabase.co https://images.unsplash.com",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://accounts.google.com https://api.groq.com https://api-inference.huggingface.co",
              "frame-src https://*.stripe.com https://accounts.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;