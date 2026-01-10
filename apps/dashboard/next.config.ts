import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_CRAWLER_API_URL:
      process.env.NEXT_PUBLIC_CRAWLER_API_URL || 'http://localhost:3001',
  },

  // Rewrites to proxy API requests to the crawler service
  async rewrites() {
    const apiUrl =
      process.env.NEXT_PUBLIC_CRAWLER_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/crawler/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: '/api/health',
        destination: `${apiUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
