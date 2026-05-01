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

  // Rewrites to proxy API requests to the appropriate services
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const aiServiceUrl
      = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:3000';
    return [
      {
        source: '/api/auth/:path*',
        destination: `${apiUrl}/api/auth/:path*`,
      },
      {
        source: '/api/itineraries/:path*',
        destination: `${apiUrl}/api/itineraries/:path*`,
      },
      {
        source: '/api/pois/:path*',
        destination: `${apiUrl}/api/pois/:path*`,
      },
      {
        source: '/api/itinerary-collaborators/:path*',
        destination: `${apiUrl}/api/itinerary-collaborators/:path*`,
      },
      // AI Service for AI/weather/transport/pdf
      {
        source: '/api/ai-service/:path*',
        destination: `${aiServiceUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
