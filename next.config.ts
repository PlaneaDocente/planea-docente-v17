import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Fuerza a que nadie use el dominio .vercel.app
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
};

export default nextConfig;