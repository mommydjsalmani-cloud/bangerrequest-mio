import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // I rewrite per /richiedi sono gestiti da vercel.json a livello CDN edge
  // (evita il problema dell'Host header nel proxy Next.js)
};

export default nextConfig;
