import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'image.pollinations.ai' },
    ],
    unoptimized: true,
  },
  // ✅ Redirigir de la URL de Vercel al dominio principal
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
  // ✅ CSP eliminada de aquí — se maneja exclusivamente en src/middleware.ts
  // Tener CSP en ambos lugares causaba conflictos y headers duplicados
};

export default nextConfig;
