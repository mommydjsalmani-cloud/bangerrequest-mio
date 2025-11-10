import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Base path per deployment sotto /richiedi su mommydj.com
  basePath: '/richiedi',
  
  // Configurazione immagini
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.scdn.co' },
      { protocol: 'https', hostname: 'mosaic.scdn.co' },
      { protocol: 'https', hostname: 'seeded-session-images.scdn.co' },
      { protocol: 'https', hostname: 'api.qrserver.com' }
    ],
    // Ottimizzazioni performance
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 3600, // Cache immagini per 1 ora
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Configurazione compilazione per performance
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },

  // Header di sicurezza
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      },
      {
        // Cache statico per asset
        source: '/(_next/static|favicon.ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        // No cache per API routes
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          }
        ]
      }
    ];
  },

  // Rewrite per API più clean
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health'
      },
      {
        source: '/status',
        destination: '/api/health'
      }
    ];
  },

  // Ottimizzazioni bundle
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },

  // Configurazione turbopack (aggiornata per Next.js 15)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Configurazione webpack per ottimizzazioni
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ottimizzazioni bundle client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Ottimizzazioni generale
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    };

    return config;
  },

  // Configurazione produzione
  ...(process.env.NODE_ENV === 'production' && {
    output: 'standalone', // Per deployment ottimizzato
    compress: true,
  }),
};

export default nextConfig;
