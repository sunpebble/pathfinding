import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    NEXT_PUBLIC_AI_SERVICE_URL:
      process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:3000',
  },

  // Rewrites to proxy API requests to the backend. Local route handlers
  // under src/app/api/ (chat, health) take priority over this afterFiles
  // rewrite, so they keep working.
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
