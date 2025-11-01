import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { 
        source: '/richiedi', 
        destination: 'https://bangerrequest-mio.vercel.app/richiedi' 
      },
      { 
        source: '/richiedi/:path*', 
        destination: 'https://bangerrequest-mio.vercel.app/richiedi/:path*' 
      },
    ];
  },
};

export default nextConfig;
