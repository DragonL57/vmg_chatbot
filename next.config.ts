import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Next.js 16: React Compiler is standard, experimental flag no longer needed */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '**',
      },
    ],
  },
  // Include data/knowledge files in the serverless function bundle for Vercel
  outputFileTracingIncludes: {
    '/api/chat': ['./data/knowledge/**/*'],
  },
};

export default nextConfig;
