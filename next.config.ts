import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Optimisations de performance
  reactStrictMode: true,
  
  // Optimiser les images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 jours
  },

  // Compiler uniquement les packages nécessaires en mode serveur
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],

  // Configuration Turbopack (utilisé en dev avec Next.js 15)
  turbopack: {
    resolveAlias: {
      // Désactiver les modules Node.js côté client (équivalent webpack fallback)
      'fs': '',
      'net': '',
      'tls': '',
    },
  },

  // Optimiser le bundling (Webpack - utilisé pour le build production)
  webpack: (config, { isServer }) => {
    // Ne pas bundler Prisma côté client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // Headers de cache pour les assets statiques + Blocage robots
  async headers() {
    return [
      // Cache pour les assets statiques
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Bloquer l'indexation sur TOUTES les pages
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet, noimageindex, nocache',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
