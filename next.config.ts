import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
    unoptimized: true, // Fallback seguro para tus evidencias dinámicas
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'planea-docente-v17-eight.vercel.app', // o el que tengas
          },
        ],
        destination: 'https://www.planeadocente.com/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;