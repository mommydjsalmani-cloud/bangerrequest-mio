import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Base path per deployment sotto /richiedi su mommydj.com
  // Solo in produzione, in sviluppo locale usa la root
  basePath: process.env.NODE_ENV === 'production' ? '/richiedi' : '',
  
  // Configurazione immagini
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn-images.dzcdn.net' },
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
    // Content Security Policy
    const cspHeader = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://cdn-images.dzcdn.net https://api.qrserver.com",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co https://api.deezer.com https://www.google.com",
      "frame-src 'self' https://www.google.com https://recaptcha.google.com",
      "form-action 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          // Previene clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // Previene MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Controlla cosa viene inviato nel Referer
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Disabilita funzionalità del browser non necessarie
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()'
          },
          // Forza HTTPS (HSTS)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: cspHeader
          },
          // Previene XSS reflection attacks
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // Cross-Origin policies
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin'
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
