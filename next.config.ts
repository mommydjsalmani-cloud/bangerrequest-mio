import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Proxy per risorse statiche Next.js dell'app esterna
      { 
        source: '/richiedi/_next/:path*', 
        destination: 'https://bangerrequest-mio.vercel.app/richiedi/_next/:path*' 
      },
      // Proxy per la pagina principale e sottopagine
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
