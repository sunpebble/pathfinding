import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_CONVEX_URL:
      process.env.NEXT_PUBLIC_CONVEX_URL || 'https://convex.kunish.org',
    NEXT_PUBLIC_AI_SERVICE_URL:
      process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:3001',
  },

  // Rewrites to proxy API requests to the appropriate services
  async rewrites() {
    const convexUrl =
      process.env.NEXT_PUBLIC_CONVEX_URL || 'https://convex.kunish.org';
    const aiServiceUrl =
      process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:3001';
    return [
      // Convex HTTP Actions for CRUD operations
      {
        source: '/api/convex/:path*',
        destination: `${convexUrl}/api/:path*`,
      },
      // AI Service for AI/weather/transport/pdf
      {
        source: '/api/ai-service/:path*',
        destination: `${aiServiceUrl}/api/:path*`,
      },
      // Health check for AI Service
      {
        source: '/api/health',
        destination: `${aiServiceUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
