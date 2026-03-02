import type { NextConfig } from "next";

// In locale usa bangerrequest sulla porta 3000, in produzione usa l'URL Vercel
const BANGERREQUEST_URL =
  process.env.BANGERREQUEST_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://bangerrequest-mio.vercel.app"
    : "http://localhost:3000");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/richiedi",
        destination: `${BANGERREQUEST_URL}/richiedi`,
      },
      {
        source: "/richiedi/:path*",
        destination: `${BANGERREQUEST_URL}/richiedi/:path*`,
      },
    ];
  },
};

export default nextConfig;
