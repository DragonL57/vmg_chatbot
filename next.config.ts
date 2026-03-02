import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Include data/knowledge files in the serverless function bundle for Vercel
  outputFileTracingIncludes: {
    '/api/chat': ['./data/knowledge/**/*'],
  },
};

export default nextConfig;
